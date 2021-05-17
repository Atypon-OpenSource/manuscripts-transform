/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Bundle, Journal } from '@manuscripts/manuscripts-json-schema'

import {
  buildAffiliation,
  buildBibliographicName,
  buildContributor,
  buildKeyword,
} from '../../transformer/builders'
import { createNewBundle, createParentBundle } from '../../transformer/bundles'
import {
  loadBundlesMap,
  loadIssnBundleIndex,
} from '../../transformer/bundles-data'
import { ISSN, parseJournalMeta } from './jats-journal-meta-parser'

const chooseBundle = async (issns: ISSN[]): Promise<string | undefined> => {
  const issnBundleIndex = await loadIssnBundleIndex()

  for (const { ISSN } of issns) {
    const normalizedIssn = ISSN.toUpperCase().replace(/[^0-9X]/g, '')

    if (normalizedIssn in issnBundleIndex) {
      return issnBundleIndex[normalizedIssn]
    }
  }
}

export const jatsFrontParser = {
  async loadJournalBundles(issns: ISSN[]) {
    if (issns.length === 0) {
      return {
        manuscript_bundle: undefined,
        bundleNodes: [],
      }
    }
    const bundleID = await chooseBundle(issns)
    const bundlesMap = bundleID ? await loadBundlesMap() : undefined
    const bundle =
      bundleID && bundlesMap ? createNewBundle(bundleID, bundlesMap) : undefined
    const parentBundle =
      bundle && bundleID && bundlesMap
        ? createParentBundle(bundle, bundlesMap)
        : undefined
    // TODO: attach CSL style as attachment?
    // TODO: choose template using bundle identifier?
    return {
      manuscript_bundle: bundle?._id,
      bundleNodes: [parentBundle, bundle].filter(
        (v) => v !== undefined
      ) as Bundle[],
    }
  },
  parseJournal(journalMeta: Element | null): Partial<Journal> {
    if (!journalMeta) {
      return {
        journalIdentifiers: [],
        abbreviatedTitles: [],
        ISSNs: [],
        publisherName: undefined,
        title: undefined,
      }
    }
    return parseJournalMeta(journalMeta)
  },
  parseKeywords(keywordGroupNode?: Element | null) {
    if (!keywordGroupNode) {
      return []
    }

    let keywordPriority = 1
    const keywords = []

    for (const keywordNode of keywordGroupNode.querySelectorAll('kwd')) {
      if (keywordNode.textContent) {
        const keyword = buildKeyword(keywordNode.textContent)
        keyword.priority = keywordPriority
        keywordPriority++
        keywords.push(keyword)
      }
    }
    return keywords
  },
  parseAffiliationNodes(affiliationNodes: Element[]) {
    const affiliationIDs = new Map<string, string>()
    const affiliations = affiliationNodes.map((affiliationNode, priority) => {
      const affiliation = buildAffiliation('', priority)

      for (const node of affiliationNode.querySelectorAll('institution')) {
        const content = node.textContent

        if (!content) {
          continue
        }

        const contentType = node.getAttribute('content-type')

        switch (contentType) {
          case null:
            affiliation.institution = content
            break

          case 'dept':
            affiliation.department = content
            break
        }
      }

      affiliation.addressLine1 =
        affiliationNode.querySelector('addr-line:nth-of-type(1)')
          ?.textContent || undefined
      affiliation.addressLine2 =
        affiliationNode.querySelector('addr-line:nth-of-type(2)')
          ?.textContent || undefined
      affiliation.addressLine3 =
        affiliationNode.querySelector('addr-line:nth-of-type(3)')
          ?.textContent || undefined

      // affiliation.postCode =
      //   affiliationNode.querySelector('postal-code')?.textContent || undefined
      // affiliation.city =
      //   affiliationNode.querySelector('city')?.textContent || undefined
      affiliation.country =
        affiliationNode.querySelector('country')?.textContent || undefined

      const id = affiliationNode.getAttribute('id')

      if (id) {
        affiliationIDs.set(id, affiliation._id)
      }

      return affiliation
    })
    return {
      affiliations,
      affiliationIDs,
    }
  },
  parseAuthorNodes(
    authorNodes: Element[],
    affiliationIDs: Map<string, string>
  ) {
    return authorNodes.map((authorNode, priority) => {
      const name = buildBibliographicName({})

      const given = authorNode.querySelector('name > given-names')?.textContent

      if (given) {
        name.given = given
      }

      const surname = authorNode.querySelector('name > surname')?.textContent

      if (surname) {
        name.family = surname
      }

      const contributor = buildContributor(name, 'author', priority)

      const corresponding = authorNode.getAttribute('corresp') === 'yes'

      if (corresponding) {
        contributor.isCorresponding = corresponding
      }

      const orcid = authorNode.querySelector(
        'contrib-id[contrib-id-type="orcid"]'
      )?.textContent

      if (orcid) {
        contributor.ORCIDIdentifier = orcid
      }

      const xrefNode = authorNode.querySelector('xref[ref-type="aff"]')

      if (xrefNode) {
        const rid = xrefNode.getAttribute('rid')

        if (rid) {
          const rids = rid
            .split(/\s+/)
            .filter((id) => affiliationIDs.has(id))
            .map((id) => affiliationIDs.get(id)) as string[]

          if (rids.length) {
            contributor.affiliations = rids
          }
        }
      }

      return contributor
    })
  },
}
