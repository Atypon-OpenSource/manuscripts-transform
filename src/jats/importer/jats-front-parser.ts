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

import debug from 'debug'

import { getTrimmedTextContent } from '../../lib/utils'
import {
  buildAffiliation,
  buildAuthorNotes,
  buildBibliographicName,
  buildContributor,
  buildCorresp,
  buildFootnote,
  buildJournal,
  buildParagraph,
  buildTitles,
} from '../../transformer'
import { parseJournalMeta } from './jats-journal-meta-parser'
import { htmlFromJatsNode } from './jats-parser-utils'

const warn = debug('manuscripts-transform')
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const defaultTitle = 'Untitled Manuscript'

export const jatsFrontParser = {
  parseTitles(
    element: Element | null,
    createElement: (tagName: string) => HTMLElement
  ) {
    if (!element) {
      return buildTitles(defaultTitle)
    }
    const title = element.querySelector('article-title')
    const subtitle = element.querySelector('subtitle')
    const runningTitle = element.querySelector(
      'alt-title[alt-title-type="right-running"]'
    )

    const titles = buildTitles(
      htmlFromJatsNode(title, createElement) ?? defaultTitle
    )
    if (subtitle) {
      titles.subtitle = htmlFromJatsNode(subtitle, createElement)
    }
    if (runningTitle) {
      titles.runningTitle = htmlFromJatsNode(runningTitle, createElement)
    }

    return titles
  },
  parseDOI(front: Element | null) {
    const doi = front?.querySelector(
      'article-meta > article-id[pub-id-type="doi"]'
    )
    return doi?.textContent ?? undefined
  },
  parseCounts(counts: Element | null) {
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
        if (countType) {
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
  parseJournal(element: Element | null) {
    const meta = parseJournalMeta(element)
    return {
      ...meta,
      ...buildJournal(),
    }
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
  parseAffiliations(elements: Element[]) {
    const affiliationIDs = new Map<string, string>()
    const affiliations = elements.map((element, priority) => {
      const affiliation = buildAffiliation('', priority)

      for (const node of element.querySelectorAll('institution')) {
        const content = node.textContent?.trim()
        if (!content) {
          continue
        }

        const type = node.getAttribute('content-type')
        if (type === 'dept') {
          affiliation.department = content
        } else {
          affiliation.institution = content
        }
      }

      affiliation.addressLine1 =
        getTrimmedTextContent(element, 'addr-line:nth-of-type(1)') || undefined
      affiliation.addressLine2 =
        getTrimmedTextContent(element, 'addr-line:nth-of-type(2)') || undefined
      affiliation.addressLine3 =
        getTrimmedTextContent(element, 'addr-line:nth-of-type(3)') || undefined
      affiliation.postCode =
        getTrimmedTextContent(element, 'postal-code') || undefined
      affiliation.country =
        getTrimmedTextContent(element, 'country') || undefined

      const email = element.querySelector('email')
      if (email) {
        affiliation.email = {
          href: email.getAttributeNS(XLINK_NAMESPACE, 'href') || undefined,
          text: email.textContent?.trim() || undefined,
        }
      }

      const id = element.getAttribute('id')

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
  parseAuthorNotes(element: Element | null) {
    if (!element) {
      return {
        footnotes: [],
        footnoteIDs: new Map<string, string>(),
        authorNotes: [],
        authorNotesParagraphs: [],
        correspondingIDs: new Map<string, string>(),
        correspondingList: [],
      }
    }
    const { footnotes, footnoteIDs } = this.parseFootnotes([
      ...element.querySelectorAll('fn:not([fn-type])'),
    ])
    const authorNotesParagraphs = this.parseParagraphs([
      ...element.querySelectorAll(':scope > p'),
    ])

    //to be added later to author-notes
    const { correspondingList, correspondingIDs } = this.parseCorresp([
      ...element.querySelectorAll('corresp'),
    ])

    const authorNotes = [
      buildAuthorNotes([
        ...footnoteIDs.values(),
        ...authorNotesParagraphs.map((p) => p._id),
      ]),
    ]

    return {
      footnotes,
      footnoteIDs,
      authorNotesParagraphs,
      authorNotes,
      correspondingIDs,
      correspondingList,
    }
  },
  parseParagraphs(elements: Element[]) {
    return elements.map((p) => buildParagraph(p.innerHTML))
  },
  parseFootnotes(elements: Element[]) {
    const footnoteIDs = new Map<string, string>()
    const footnotes = elements.map((element) => {
      const fn = buildFootnote('', element.innerHTML)
      const id = element.getAttribute('id')
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
  parseCorresp(elements: Element[]) {
    const correspondingIDs = new Map<string, string>()
    const correspondingList = elements.map((element) => {
      const label = element.querySelector('label')
      // Remove the label before extracting the textContent (prevent duplicate text)
      if (label) {
        label.remove()
      }
      const corresponding = buildCorresp(element.textContent?.trim() ?? '')
      corresponding.label = label?.textContent?.trim() || undefined
      const id = element.getAttribute('id')
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
  parseContributors(
    elements: Element[],
    affiliationIDs: Map<string, string>,
    footnoteIDs: Map<string, string>,
    correspondingIDs: Map<string, string>
  ) {
    return elements.map((element, priority) => {
      const name = buildBibliographicName({})

      const given = getTrimmedTextContent(element, 'name > given-names')
      if (given) {
        name.given = given
      }

      const surname = getTrimmedTextContent(element, 'name > surname')
      if (surname) {
        name.family = surname
      }

      const contributor = buildContributor(name, 'author', priority)

      const corresponding = element.getAttribute('corresp') === 'yes'
      if (corresponding) {
        contributor.isCorresponding = corresponding
      }

      const orcid = getTrimmedTextContent(
        element,
        'contrib-id[contrib-id-type="orcid"]'
      )
      if (orcid) {
        contributor.ORCIDIdentifier = orcid
      }

      const xrefs = element.querySelectorAll('xref')

      for (const xref of xrefs) {
        if (xref) {
          const rid = xref.getAttribute('rid')
          const type = xref.getAttribute('ref-type')
          if (rid) {
            //check the xref note type, if fn(footnote) then map the note content and id in array
            if (type === 'fn') {
              contributor.footnote = []
              const footnoteID = footnoteIDs.get(rid)
              if (footnoteID) {
                const authorFootNoteRef = {
                  noteID: footnoteID,
                  noteLabel: xref.textContent?.trim() || '',
                }
                contributor.footnote.push(authorFootNoteRef)
              }
            } else if (type === 'corresp') {
              contributor.corresp = []
              const correspID = correspondingIDs.get(rid)
              if (correspID) {
                const authorCorrespRef = {
                  correspID: correspID,
                  correspLabel: xref.textContent?.trim() || '',
                }
                contributor.corresp.push(authorCorrespRef)
              }
            } else if (type === 'aff') {
              const rids = rid
                .split(/\s+/)
                .map((id) => affiliationIDs.get(id))
                .filter(Boolean) as string[]
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
