/*!
 * © 2019 Atypon Systems LLC
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

import { ElementsOrder, ObjectTypes } from '@manuscripts/json-schema'

import { Decoder } from '../decode'
import { encode } from '../encode'
import { ManuscriptModel } from '../models'
import { createTestDoc } from './__helpers__/doc'
import {
  createTestModelMapWithElements,
  createTestModelMapWithHighlights,
  createTestModelMapWithKeywords,
  createTestModelMapWithKeywordsAndAuthorQuery,
} from './__helpers__/highlights'

const normalize = (model: ManuscriptModel) => {
  for (const key of Object.keys(model)) {
    const value = model[key as keyof ManuscriptModel]
    if (value === undefined) {
      delete model[key as keyof ManuscriptModel]
    }
  }

  model.containerID = 'MPProject:1'
  model.manuscriptID = 'MPManuscript:1'
  model.createdAt = 0
  model.updatedAt = 0

  return model as ManuscriptModel
}

describe('encoder', () => {
  test('encode a test doc', async () => {
    const doc = createTestDoc()

    const result = encode(doc)

    let idx = 1
    for (const item of Array.from(result.values())) {
      if (item.objectType === ObjectTypes.ElementsOrder) {
        result.delete(item._id)
        item._id = `MPElementsOrder:${idx++}`
        result.set(item._id, item)
      }
    }

    expect(result).toMatchSnapshot()
  })

  test('encode highlight markers', async () => {
    const modelMap = createTestModelMapWithHighlights()

    const decoder = new Decoder(modelMap)

    const doc = decoder.createArticleNode()

    const result = encode(doc)

    let idx = 1
    for (const item of Array.from(result.values())) {
      if (item.objectType === ObjectTypes.ElementsOrder) {
        result.delete(item._id)
        item._id = `MPElementsOrder:${idx++}`
        result.set(item._id, item)
      }
    }

    expect(result).toMatchSnapshot()

    for (const item of result.values()) {
      if (item.objectType === ObjectTypes.ElementsOrder) {
        continue
      }
      const model = normalize(item as ManuscriptModel)
      expect(model).toEqual(modelMap.get(model._id))
    }
  })

  test('encode keywords element', async () => {
    const modelMap = createTestModelMapWithKeywords()

    const decoder = new Decoder(modelMap)

    const doc = decoder.createArticleNode()

    const result = encode(doc)

    expect(result).toMatchSnapshot()

    for (const item of result.values()) {
      const model = normalize(item as ManuscriptModel)
      expect(model).toEqual(modelMap.get(model._id))
    }
  })

  test('encode keywords & authorQuery', async () => {
    const modelMap = createTestModelMapWithKeywordsAndAuthorQuery()

    const decoder = new Decoder(modelMap)

    const doc = decoder.createArticleNode()

    const result = encode(doc)

    for (const item of result.values()) {
      const model = normalize(item as ManuscriptModel)
      expect(model).toEqual(modelMap.get(model._id))
    }
  })

  test('encode generates ElementsOrder', () => {
    const { modelMap, elements } = createTestModelMapWithElements()

    const decoder = new Decoder(modelMap)

    const doc = decoder.createArticleNode()

    const result = encode(doc)

    for (const model of result.values()) {
      if (model.objectType !== ObjectTypes.ElementsOrder) {
        continue
      }
      const order = model as ElementsOrder
      const type = order.elementType
      expect(order.elements).toEqual(elements[type])
    }
  })
})
