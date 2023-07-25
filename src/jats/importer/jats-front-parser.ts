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

import { Journal } from '@manuscripts/json-schema'
import debug from 'debug'

import { getTrimmedTextContent } from '../../lib/utils'
import {
  buildAffiliation,
  buildBibliographicName,
  buildContributor,
  buildCorresp,
  buildFootnote,
  buildSupplementaryMaterial,
} from '../../transformer/builders'
import { parseJournalMeta } from './jats-journal-meta-parser'

const warn = debug('manuscripts-transform')
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export const jatsFrontParser = {
  parseCounts(counts: Element | null | undefined) {
    if (counts) {
      const parseCount = (count: string | null | undefined) => {
        if (count && /^-?\d+$/.test(count)) {
          return parseInt(count)
        } else if (count) {
          warn(`Invalid count number for ${count}`)
        }
      }

      const genericCounts = []
      const countElements = counts.querySelectorAll('count')
      for (const element of countElements.values()) {
        const countType = element.getAttribute('count-type')
        const count = parseCount(element.getAttribute('count'))
        if (countType && typeof count === 'number') {
          const genericCount = { count, countType }
          genericCounts.push(genericCount)
        }
      }

      return {
        wordCount: parseCount(
          counts.querySelector('word-count')?.getAttribute('count')
        ),
        figureCount: parseCount(
          counts.querySelector('fig-count')?.getAttribute('count')
        ),
        tableCount: parseCount(
          counts.querySelector('table-count')?.getAttribute('count')
        ),
        equationCount: parseCount(
          counts.querySelector('equation-count')?.getAttribute('count')
        ),
        referencesCount: parseCount(
          counts.querySelector('ref-count')?.getAttribute('count')
        ),
        genericCounts: genericCounts.length > 0 ? genericCounts : undefined,
      }
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
  parseDates(historyNode: Element | null) {
    if (!historyNode) {
      return undefined
    }
    const history: {
      acceptanceDate?: number
      correctionDate?: number
      retractionDate?: number
      revisionRequestDate?: number
      revisionReceiveDate?: number
      receiveDate?: number
    } = {}

    const dateToTimestamp = (dateElement: Element) => {
      const selectors = ['year', 'month', 'day']
      const values: Array<number> = []
      for (const selector of selectors) {
        const value = getTrimmedTextContent(dateElement, selector)
        if (!value || isNaN(+value)) {
          return
        }
        values.push(+value)
      }

      // timestamp stored in seconds in manuscript schema
      return Date.UTC(values[0], values[1], values[2]) / 1000 // ms => s
    }

    for (const date of historyNode.children) {
      const dateType = date.getAttribute('date-type')
      switch (dateType) {
        case 'received': {
          history.receiveDate = dateToTimestamp(date)
          break
        }
        case 'rev-recd': {
          history.revisionReceiveDate = dateToTimestamp(date)
          break
        }
        case 'accepted': {
          history.acceptanceDate = dateToTimestamp(date)
          break
        }
        case 'rev-request': {
          history.revisionRequestDate = dateToTimestamp(date)
          break
        }
        case 'retracted': {
          history.retractionDate = dateToTimestamp(date)
          break
        }
        case 'corrected': {
          history.correctionDate = dateToTimestamp(date)
          break
        }
      }
    }
    return history
  },
  parseSupplements(supplementNodes: Element[] | null) {
    if (!supplementNodes || supplementNodes.length === 0) {
      return []
    }
    const supplements = []
    for (const supplementNode of supplementNodes) {
      const supplTitle =
        getTrimmedTextContent(supplementNode, 'caption > title') ?? ''
      const href = supplementNode.getAttributeNS(XLINK_NAMESPACE, 'href') ?? ''
      const supplementaryMaterial = buildSupplementaryMaterial(supplTitle, href)
      const mimeType = supplementNode.getAttribute('mimetype') ?? ''
      const mimeSubtype = supplementNode.getAttribute('mime-subtype') ?? ''
      if (mimeType && mimeSubtype) {
        supplementaryMaterial.MIME = [mimeType, mimeSubtype].join('/')
      }
      supplements.push(supplementaryMaterial)
    }
    return supplements
  },
  parseAffiliationNodes(affiliationNodes: Element[]) {
    const affiliationIDs = new Map<string, string>()
    const affiliations = affiliationNodes.map((affiliationNode, priority) => {
      const affiliation = buildAffiliation('', priority)

      for (const node of affiliationNode.querySelectorAll('institution')) {
        const content = node.textContent?.trim()

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
        getTrimmedTextContent(affiliationNode, 'addr-line:nth-of-type(1)') ||
        undefined
      affiliation.addressLine2 =
        getTrimmedTextContent(affiliationNode, 'addr-line:nth-of-type(2)') ||
        undefined
      affiliation.addressLine3 =
        getTrimmedTextContent(affiliationNode, 'addr-line:nth-of-type(3)') ||
        undefined
      const emailNode = affiliationNode.querySelector('email')
      if (emailNode) {
        affiliation.email = {
          href: emailNode.getAttributeNS(XLINK_NAMESPACE, 'href') || undefined,
          text: emailNode.textContent?.trim() || undefined,
        }
      }
      affiliation.postCode =
        getTrimmedTextContent(affiliationNode, 'postal-code') || undefined
      // affiliation.city =
      //   affiliationNode.querySelector('city')?.textContent || undefined
      affiliation.country =
        getTrimmedTextContent(affiliationNode, 'country') || undefined

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
  parseFootnoteNodes(footnoteNodes: Element[]) {
    const footnoteIDs = new Map<string, string>()
    const footnotes = footnoteNodes.map((footnoteNode) => {
      const fn = buildFootnote('', footnoteNode.innerHTML)
      const id = footnoteNode.getAttribute('id')
      if (id) {
        footnoteIDs.set(id, fn._id)
      }
      return fn
    })
    return {
      footnotes,
      footnoteIDs,
    }
  },
  parseCorrespNodes(correspNodes: Element[]) {
    const correspondingIDs = new Map<string, string>()
    const correspondingList = correspNodes.map((correspNode) => {
      const label = correspNode.querySelector('label')
      // Remove the label before extracting the textContent (prevent duplicate text)
      if (label) {
        label.remove()
      }
      const corresponding = buildCorresp(correspNode.textContent?.trim() ?? '')
      corresponding.label = label?.textContent?.trim() || undefined
      const id = correspNode.getAttribute('id')
      if (id) {
        correspondingIDs.set(id, corresponding._id)
      }
      return corresponding
    })
    return {
      correspondingList,
      correspondingIDs,
    }
  },
  parseAuthorNodes(
    authorNodes: Element[],
    affiliationIDs: Map<string, string>,
    footnoteIDs: Map<string, string>,
    correspondingIDs: Map<string, string>
  ) {
    return authorNodes.map((authorNode, priority) => {
      const name = buildBibliographicName({})

      const given = getTrimmedTextContent(authorNode, 'name > given-names')

      if (given) {
        name.given = given
      }

      const surname = getTrimmedTextContent(authorNode, 'name > surname')

      if (surname) {
        name.family = surname
      }

      const contributor = buildContributor(name, 'author', priority)

      const corresponding = authorNode.getAttribute('corresp') === 'yes'

      if (corresponding) {
        contributor.isCorresponding = corresponding
      }

      const orcid = getTrimmedTextContent(
        authorNode,
        'contrib-id[contrib-id-type="orcid"]'
      )

      if (orcid) {
        contributor.ORCIDIdentifier = orcid
      }

      const xrefNodes = authorNode.querySelectorAll('xref')

      for (const xrefNode of xrefNodes) {
        if (xrefNode) {
          const rid = xrefNode.getAttribute('rid')
          const rtype = xrefNode.getAttribute('ref-type')
          if (rid) {
            //check the xref note type, if fn(footnote) then map the note content and id in array
            if (rtype === 'fn') {
              contributor.footnote = []
              const footnoteId = footnoteIDs.get(rid)
              if (footnoteId) {
                const authorFootNoteRef = {
                  noteID: footnoteId,
                  noteLabel: xrefNode.textContent?.trim() || '',
                }
                contributor.footnote.push(authorFootNoteRef)
              }
            } else if (rtype === 'corresp') {
              contributor.corresp = []
              const correspId = correspondingIDs.get(rid)
              if (correspId) {
                const authorCorrespRef = {
                  correspID: correspId,
                  correspLabel: xrefNode.textContent?.trim() || '',
                }
                contributor.corresp.push(authorCorrespRef)
              }
            }
            //check the xref note type, if aff then map the aff ids in array
            else if (rtype === 'aff') {
              const rids = rid
                .split(/\s+/)
                .filter((id) => affiliationIDs.has(id))
                .map((id) => affiliationIDs.get(id)) as string[]
              if (rids.length) {
                contributor.affiliations = rids
              }
            }
          }
        }
      }
      return contributor
    })
  },
}
