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

import { parseJournalMeta } from '../importer/jats-journal-meta-parser'
import { readAndParseFixture } from './files'
describe('JATS journal metadata', () => {
  test('extracts journal metadata from JATS XML', async () => {
    const article = await readAndParseFixture('jats-example-full.xml')
    // journal meta
    const journalMeta = article.querySelector('journal-meta')

    if (!journalMeta) {
      throw new Error('journal-meta not found')
    }

    const journal = (await parseJournalMeta(journalMeta)) as Journal

    expect(journal.title).toBe('Journal Title')
    expect(journal.abbreviatedTitles).toHaveLength(1)
    expect(journal.abbreviatedTitles![0]).toStrictEqual({
      abbrevType: 'pubmed',
      abbreviatedTitle: 'PubMed Abbreviated Journal Title',
    })
    expect(journal.ISSNs).toHaveLength(1)
    expect(journal.ISSNs![0]).toEqual({ ISSN: '1234-5678' })
    expect(journal.publisherName).toBe('Publisher Name')
  })
})
