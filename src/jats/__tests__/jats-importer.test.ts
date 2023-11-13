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

import { parseJATSArticle, parseJATSBody } from '../importer'
import { readAndParseFixture } from './files'
import { normalizeIDs, normalizeTimestamps } from './ids'

jest.setTimeout(200000)
describe('JATS importer', () => {
  test('parses minimal JATS body to a ProseMirror doc', async () => {
    const article = await readAndParseFixture('jats-example.xml')

    const body = article.querySelector('body') as Element
    const doc = parseJATSBody(
      article,
      body,
      null,
      [],
      [],
      [],
      undefined,
      undefined
    )

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      // @ts-ignore
      delete node.attrs.id
      // @ts-ignore
      delete node.attrs.rid
    })
    // @ts-ignore
    delete doc.attrs.id

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS body to a ProseMirror doc', async () => {
    const article = await readAndParseFixture('jats-example-full.xml')

    const body = article.querySelector('body') as Element

    const doc = parseJATSBody(
      article,
      body,
      null,
      [],
      [],
      [],
      undefined,
      undefined
    )

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      // @ts-ignore
      delete node.attrs.id
      // @ts-ignore
      delete node.attrs.rid
    })
    // @ts-ignore
    delete doc.attrs.id

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS example to Manuscripts models', async () => {
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-doc.xml')
    )
    expect(normalizeIDs(normalizeTimestamps(models))).toMatchSnapshot()
  })

  test('parses JATS AuthorQueries example to Manuscripts models', async () => {
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-document.xml')
    )
    expect(normalizeIDs(normalizeTimestamps(models))).toMatchSnapshot()
  })

  test('parses JATS front only example to Manuscripts models', async () => {
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-front-only.xml')
    )
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no back example to Manuscripts models', async () => {
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-no-back.xml')
    )
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no body example to Manuscripts models', async () => {
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-no-body.xml')
    )
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS article to Manuscripts models', async () => {
    const article = await readAndParseFixture('jats-example.xml')
    const models = await parseJATSArticle(article)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS article with tables and table footnotes', async () => {
    const article = await readAndParseFixture('jats-tables-example.xml')
    const models = await parseJATSArticle(article)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })
})
