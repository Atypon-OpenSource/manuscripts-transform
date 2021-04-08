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
import { readFile } from 'fs-extra'

import { Journal, parseJournalMeta } from '../jats-journal-meta'

describe('JATS journal metadata', () => {
  test('extracts journal metadata from JATS XML', async () => {
    const xml = await readFile(
      __dirname + '/data/jats-example-full.xml',
      'utf-8'
    )
    const doc = new DOMParser().parseFromString(xml, 'application/xml')

    // journal meta

    const journalMeta = doc.querySelector('journal-meta')

    if (!journalMeta) {
      throw new Error('journal-meta not found')
    }

    const journal = (await parseJournalMeta(journalMeta)) as Journal

    expect(journal.title).toBe('Journal Title')
    expect(journal.abbreviatedTitles).toHaveLength(1)
    expect(journal.abbreviatedTitles![0]).toStrictEqual({
      type: 'pubmed',
      value: 'PubMed Abbreviated Journal Title',
    })
    expect(journal.issns).toHaveLength(1)
    expect(journal.issns![0]).toStrictEqual({ type: null, value: '1234-5678' })
    expect(journal.publisherName).toBe('Publisher Name')
  })
})
