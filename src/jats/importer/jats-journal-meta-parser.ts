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
  element: Element | null
): JournalIdentifier[] => {
  if (!element) {
    return []
  }
  const output: JournalIdentifier[] = []

  const ids = element.querySelectorAll('journal-id')

  for (const id of ids) {
    const type = id.getAttribute('journal-id-type')
    const value = id.textContent?.trim()

    if (!value) {
      continue
    }

    output.push({
      journalID: value,
      journalIDType: type ?? undefined,
    })
  }

  return output
}

export const parseJournalAbbreviatedTitles = (
  element: Element | null
): AbbreviatedTitle[] => {
  if (!element) {
    return []
  }
  const output: AbbreviatedTitle[] = []

  const titles = element.querySelectorAll(
    'journal-title-group > abbrev-journal-title'
  )

  for (const title of titles) {
    const type = title.getAttribute('abbrev-type')
    const value = title.textContent?.trim()

    if (!value) {
      continue
    }

    output.push({
      abbreviatedTitle: value,
      abbrevType: type ?? undefined,
    })
  }

  return output
}

export const parseJournalISSNs = (element: Element | null): ISSN[] => {
  if (!element) {
    return []
  }
  const output: ISSN[] = []

  const issns = element.querySelectorAll('issn')

  for (const issn of issns) {
    const type = issn.getAttribute('pub-type')
    const value = issn.textContent?.trim()

    if (!value) {
      continue
    }

    output.push({
      ISSN: value,
      publicationType: type ?? undefined,
    })
  }

  return output
}

export const parseJournalMeta = (element: Element | null) => {
  return {
    abbreviatedTitles: parseJournalAbbreviatedTitles(element),
    journalIdentifiers: parseJournalIdentifiers(element),
    ISSNs: parseJournalISSNs(element),
    publisherName:
      getTrimmedTextContent(element, 'publisher > publisher-name') ?? undefined,
    title:
      getTrimmedTextContent(element, 'journal-title-group > journal-title') ??
      undefined,
  }
}
