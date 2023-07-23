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

import { getTrimmedTextContent } from '../../lib/utils'

export type ISSN = {
  ISSN: string
  publicationType?: string
}

export type AbbreviatedTitle = {
  abbreviatedTitle: string
  abbrevType?: string
}
export type JournalIdentifier = {
  journalID: string
  journalIDType?: string
}
export const parseJournalIdentifiers = (
  journalMeta: Element
): Array<JournalIdentifier> => {
  const output: Array<JournalIdentifier> = []

  const elements = journalMeta.querySelectorAll('journal-id')

  for (const element of elements) {
    const journalIDType = element.getAttribute('journal-id-type')
    const journalID = element.textContent?.trim() ?? element.textContent

    if (journalID !== null && journalIDType != null) {
      output.push({ journalIDType, journalID })
    } else if (journalID !== null) {
      output.push({ journalID })
    }
  }

  return output
}

export const parseJournalAbbreviatedTitles = (
  journalMeta: Element
): Array<AbbreviatedTitle> => {
  const output: Array<AbbreviatedTitle> = []

  const elements = journalMeta.querySelectorAll(
    'journal-title-group > abbrev-journal-title'
  )

  for (const element of elements) {
    const abbrevType = element.getAttribute('abbrev-type')
    const abbreviatedTitle = element.textContent?.trim() ?? element.textContent
    if (abbreviatedTitle !== null && abbrevType !== null) {
      output.push({ abbreviatedTitle, abbrevType })
    } else if (abbreviatedTitle !== null) {
      output.push({ abbreviatedTitle })
    }
  }

  return output
}

export const parseJournalISSNs = (journalMeta: Element): Array<ISSN> => {
  const output: Array<ISSN> = []

  const elements = journalMeta.querySelectorAll('issn')

  for (const element of elements) {
    const publicationType = element.getAttribute('pub-type')
    const ISSN = element.textContent?.trim() ?? element.textContent
    if (publicationType !== null && ISSN !== null) {
      output.push({ publicationType, ISSN })
    } else if (ISSN !== null) {
      output.push({ ISSN })
    }
  }

  return output
}

export const parseJournalMeta = (journalMeta: Element) => {
  return {
    abbreviatedTitles: parseJournalAbbreviatedTitles(journalMeta),
    journalIdentifiers: parseJournalIdentifiers(journalMeta),
    ISSNs: parseJournalISSNs(journalMeta),
    publisherName:
      getTrimmedTextContent(journalMeta, 'publisher > publisher-name') ??
      undefined,
    title:
      getTrimmedTextContent(
        journalMeta,
        'journal-title-group > journal-title'
      ) ?? undefined,
  }
}
