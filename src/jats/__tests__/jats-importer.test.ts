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

import { parseJATSArticle } from '../importer'
import { readAndParseFixture } from './files'
import { normalizeIDs, normalizeTimestamps } from './ids'

describe('JATS importer', () => {
  test('parses full JATS example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-example-doc.xml')
    const models = parseJATSArticle(jats)
    expect(normalizeIDs(normalizeTimestamps(models))).toMatchSnapshot()
  })

  test('parses JATS AuthorQueries example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-import.xml')
    const models = parseJATSArticle(jats)
    expect(normalizeIDs(normalizeTimestamps(models))).toMatchSnapshot()
  })

  test('parses JATS front only example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-example-front-only.xml')
    const models = parseJATSArticle(jats)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no back example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-example-no-back.xml')
    const models = parseJATSArticle(jats)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no body example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-example-no-body.xml')
    const models = parseJATSArticle(jats)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS article to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-example.xml')
    const models = parseJATSArticle(jats)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS article with tables and table footnotes', async () => {
    const jats = await readAndParseFixture('jats-tables-example.xml')
    const models = parseJATSArticle(jats)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test("parses JATS article without references and doesn't create empty references section", async () => {
    const jats = await readAndParseFixture('jats-import-no-refs.xml')
    const models = parseJATSArticle(jats)

    expect(normalizeIDs(normalizeTimestamps(models))).toMatchSnapshot()
  })
})
