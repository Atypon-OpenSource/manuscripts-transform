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

import { Model } from '@manuscripts/manuscripts-json-schema'
import fs from 'fs'

import {
  parseJATSArticle,
  parseJATSBody,
  parseJATSFront,
} from '../jats-importer'
import { addModelToMap } from '../model-map'
import { normalizeIDs } from './__helpers__/ids'

const loadFixture = async (filename: string) => {
  const xml = await fs.promises.readFile(
    __dirname + '/data/' + filename,
    'utf-8'
  )

  return new DOMParser().parseFromString(xml as string, 'application/xml')
}

describe('JATS importer', () => {
  test('parses minimal JATS body to a ProseMirror doc', async () => {
    const article = await loadFixture('jats-example.xml')

    const modelMap = new Map()
    const doc = parseJATSBody(article, modelMap)

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      delete node.attrs.id
      delete node.attrs.rid
    })

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS body to a ProseMirror doc', async () => {
    const article = await loadFixture('jats-example-full.xml')

    const modelMap = new Map()
    const doc = parseJATSBody(article, modelMap)

    doc.descendants((node) => {
      // TODO: validate ids before deleting them
      delete node.attrs.id
      delete node.attrs.rid
    })

    expect(doc).toMatchSnapshot()
  })

  test('parses full JATS example to Manuscripts models', async () => {
    const article = await loadFixture('jats-example-doc.xml')

    const models = await parseJATSArticle(article)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS front to Manuscripts models', async () => {
    const article = await loadFixture('jats-example.xml')

    const modelMap = new Map<string, Model>()
    const addModel = addModelToMap(modelMap)

    await parseJATSFront(article, addModel)

    const models = [...modelMap.values()]

    expect(normalizeIDs(models)).toMatchSnapshot()
  })

  test('parses JATS article to Manuscripts models', async () => {
    const article = await loadFixture('jats-example.xml')

    const models = await parseJATSArticle(article)

    expect(normalizeIDs(models)).toMatchSnapshot()
  })
})
