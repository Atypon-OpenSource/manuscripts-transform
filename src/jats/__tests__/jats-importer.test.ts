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

import { parseJATSArticle, parseJATSBody, parseJATSFront } from '../importer'
import { readAndParseFixture } from './files'
import { normalizeIDs } from './ids'

describe('JATS importer', () => {
  test('parses minimal JATS body to a ProseMirror doc', async () => {
    const article = await readAndParseFixture('jats-example.xml')

    const body = article.querySelector('body') as Element
    const doc = parseJATSBody(article, body, null, [])

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      delete node.attrs.id
      delete node.attrs.rid
    })
    delete doc.attrs.id

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS body to a ProseMirror doc', async () => {
    const article = await readAndParseFixture('jats-example-full.xml')

    const body = article.querySelector('body') as Element
    const doc = parseJATSBody(article, body, null, [])

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      delete node.attrs.id
      delete node.attrs.rid
    })
    delete doc.attrs.id

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS example to Manuscripts models', async () => {
    const start = performance.now()
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-doc.xml')
    )
    const end = performance.now()
    expect(end - start).toBeLessThan(4800)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS front only example to Manuscripts models', async () => {
    const start = performance.now()
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-front-only.xml')
    )
    const end = performance.now()
    expect(end - start).toBeLessThan(4500)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no back example to Manuscripts models', async () => {
    const start = performance.now()
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-no-back.xml')
    )
    const end = performance.now()
    expect(end - start).toBeLessThan(4500)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses full JATS no body example to Manuscripts models', async () => {
    const start = performance.now()
    const models = await parseJATSArticle(
      await readAndParseFixture('jats-example-no-body.xml')
    )
    const end = performance.now()
    expect(end - start).toBeLessThan(4500)
    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS front to Manuscripts models', async () => {
    const article = await readAndParseFixture('jats-example.xml')
    const front = article.querySelector('front') as Element
    const { models } = await parseJATSFront(front)

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
