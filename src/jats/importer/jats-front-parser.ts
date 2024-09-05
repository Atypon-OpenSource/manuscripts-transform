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
import { buildJournal } from '../../transformer'
import { parseJournalMeta } from './jats-journal-meta-parser'

const warn = debug('manuscripts-transform')

export const jatsFrontParser = {
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
}
