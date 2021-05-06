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

export type TypedValue = { type?: string | null; value: string }

export interface Journal {
  abbreviatedTitles?: TypedValue[]
  identifiers?: TypedValue[]
  issns?: TypedValue[]
  publisherName?: string
  title?: string
}

export const parseJournalIdentifiers = (
  journalMeta: Element
): Array<TypedValue> => {
  const output: Array<TypedValue> = []

  const elements = journalMeta.querySelectorAll('journal-id')

  for (const element of elements) {
    const type = element.getAttribute('journal-id-type')
    const value = element.textContent

    if (value !== null) {
      output.push({ type, value })
    }
  }

  return output
}

export const parseJournalAbbreviatedTitles = (
  journalMeta: Element
): Array<TypedValue> => {
  const output: Array<TypedValue> = []

  const elements = journalMeta.querySelectorAll(
    'journal-title-group > abbrev-journal-title'
  )

  for (const element of elements) {
    const type = element.getAttribute('abbrev-type')
    const value = element.textContent

    if (value !== null) {
      output.push({ type, value })
    }
  }

  return output
}

export const parseJournalISSNs = (journalMeta: Element): Array<TypedValue> => {
  const output: Array<TypedValue> = []

  const elements = journalMeta.querySelectorAll('issn')

  for (const element of elements) {
    const type = element.getAttribute('pub-type')
    const value = element.textContent

    if (value) {
      output.push({ type, value })
    }
  }

  return output
}

export const parseJournalMeta = (journalMeta: Element) => {
  return {
    abbreviatedTitles: parseJournalAbbreviatedTitles(journalMeta),
    identifiers: parseJournalIdentifiers(journalMeta),
    issns: parseJournalISSNs(journalMeta),
    publisherName:
      journalMeta.querySelector('publisher > publisher-name')?.textContent ??
      undefined,
    title:
      journalMeta.querySelector('journal-title-group > journal-title')
        ?.textContent ?? undefined,
  }
}
