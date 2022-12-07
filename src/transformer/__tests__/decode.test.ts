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

import {
  Model,
  ObjectTypes,
  Section,
} from '@manuscripts/manuscripts-json-schema'

import { MissingElement } from '../../errors'
import { ManuscriptNode, ManuscriptNodeType, schema } from '../../schema'
import { Decoder, getModelData, sortSectionsByPriority } from '../decode'
import { createTestModelMapWithCitations } from './__helpers__/citations'
import { createTestDoc, createTestModelMap } from './__helpers__/doc'
import {
  createTestModelMapWithDeprecatedKeywords,
  createTestModelMapWithHighlights,
  createTestModelMapWithKeywords,
} from './__helpers__/highlights'

const countDescendantsOfType = (
  node: ManuscriptNode,
  type: ManuscriptNodeType
) => {
  let count = 0

  node.descendants((childNode) => {
    if (childNode.type === type) {
      count++
    }
  })

  return count
}

const createDoc = (
  modelMap: Map<string, Model>,
  allowMissingElements = true
) => {
  const decoder = new Decoder(modelMap, allowMissingElements)

  return decoder.createArticleNode()
}

describe('decoder', () => {
  test('create test doc', async () => {
    const doc = createTestDoc()

    expect(doc).toMatchSnapshot()
  })

  test('create test doc with missing data', async () => {
    const modelMap = createTestModelMap()

    const beforeDoc = createDoc(modelMap)
    expect(countDescendantsOfType(beforeDoc, schema.nodes.placeholder)).toBe(0)
    expect(
      countDescendantsOfType(beforeDoc, schema.nodes.placeholder_element)
    ).toBe(0)
    expect(beforeDoc).toMatchSnapshot('decoded-without-placeholders')

    modelMap.delete('MPTable:2A2413E2-71F5-4B6C-F513-7B44748E49A8')
    modelMap.delete('MPFigureElement:A5D68C57-B5BB-4D10-E0C3-ECED717A2AA7')
    modelMap.delete('MPParagraphElement:05A0ED43-8928-4C69-A17C-0A98795001CD')
    modelMap.delete('MPBibliographyItem:8C394C86-F7B0-48CE-D5BC-E7A10FCE7FA5')
    modelMap.delete('MPCitation:C1BA9478-E940-4273-CB5C-0DDCD62CFBF2')

    const afterDoc = createDoc(modelMap)
    expect(countDescendantsOfType(afterDoc, schema.nodes.placeholder)).toBe(2)
    expect(
      countDescendantsOfType(afterDoc, schema.nodes.placeholder_element)
    ).toBe(2)
    expect(afterDoc).toMatchSnapshot('decoded-with-placeholders')
  })

  test('create test doc disallowing a missing data', async () => {
    const modelMap = createTestModelMap()

    modelMap.delete('MPParagraphElement:05A0ED43-8928-4C69-A17C-0A98795001CD')

    expect(() => createDoc(modelMap, false)).toThrowError(MissingElement)
  })

  test('getModelData', () => {
    const data = getModelData({
      _rev: 'x',
      _deleted: true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      sessionID: 'xyz',
      _id: 'MPManuscript:X',
      objectType: ObjectTypes.Manuscript,
    })
    expect(data).toEqual({
      _id: 'MPManuscript:X',
      objectType: ObjectTypes.Manuscript,
    })
  })

  test('sortSectionsByPriority', () => {
    const sectionA: Section = {
      _id: 'MPSection:A',
      objectType: ObjectTypes.Section,
      priority: 0,
      title: 'A',
      path: ['MPSection:A'],
      elementIDs: [],
      containerID: 'MPProject:X',
      manuscriptID: 'MPManuscript:X',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      sessionID: 'xyz',
    }
    const sectionB: Section = {
      _id: 'MPSection:B',
      objectType: ObjectTypes.Section,
      priority: 1,
      title: 'B',
      path: ['MPSection:A'],
      elementIDs: [],
      containerID: 'MPProject:X',
      manuscriptID: 'MPManuscript:X',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      sessionID: 'xyz',
    }
    expect(sortSectionsByPriority(sectionA, sectionA)).toEqual(0)
    expect(sortSectionsByPriority(sectionA, sectionB)).toEqual(-1)
    expect(sortSectionsByPriority(sectionB, sectionA)).toEqual(1)
  })

  test('decode highlight markers', () => {
    const modelMap = createTestModelMapWithHighlights()

    const decoder = new Decoder(modelMap)

    const result = decoder.createArticleNode()

    expect(result).toMatchSnapshot()
  })

  test('decode citations', () => {
    const modelMap = createTestModelMapWithCitations()

    const decoder = new Decoder(modelMap)

    const result = decoder.createArticleNode()

    expect(result).toMatchSnapshot()
  })

  test('decode keyword element', () => {
    const modelMap = createTestModelMapWithKeywords()

    const decoder = new Decoder(modelMap)

    const result = decoder.createArticleNode()

    expect(result).toMatchSnapshot()
  })

  test('decode keywords section with paragraph element', () => {
    const modelMap = createTestModelMapWithDeprecatedKeywords()

    const decoder = new Decoder(modelMap)

    const result = decoder.createArticleNode()

    expect(result).toMatchSnapshot()
  })
})
