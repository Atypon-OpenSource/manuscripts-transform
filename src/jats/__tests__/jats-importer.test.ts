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

import {
  ContainedModel,
  Manuscript,
  ObjectTypes,
  Section,
} from '@manuscripts/json-schema'
import { hasObjectType } from 'migration-base'

import { ManuscriptNode, schema } from '../../schema'
import { Decoder } from '../../transformer'
import { parseJATSArticle } from '../importer'
import {
  createArticleNode,
  parseJATSArticleToNode,
} from '../importer/parse-jats-article'
import { readAndParseFixture } from './files'
import { normalizeIDs, normalizeTimestamps } from './ids'

const getContainedModelsMap = (projectResources: ContainedModel[]) => {
  projectResources
    .filter(hasObjectType<Section>(ObjectTypes.Section))
    .forEach((section: Section) => {
      section.generatedLabel = true
    })
  return new Map<string, ContainedModel>(
    projectResources.map((model) => [model._id, model])
  )
}

describe('JATS importer', () => {
  test('parses full JATS example to Manuscripts models', async () => {
    let jats = await readAndParseFixture('jats-import.xml')
    const models = parseJATSArticle(jats)
    const manuscript = models.find(
      (m) => m.objectType === 'MPManuscript'
    ) as Manuscript
    const modelMap = getContainedModelsMap(models as ContainedModel[])
    const node = new Decoder(modelMap, false).createArticleNode(
      manuscript._id
    ) as ManuscriptNode
    jats = await readAndParseFixture('jats-import.xml')
    const secondNode = parseJATSArticleToNode(jats, true) as ManuscriptNode
    let paranode = null
    node.descendants((desc) => {
      if (
        desc.attrs.id ===
        node.content.content[9].content.content[0].attrs.target
      ) {
        paranode = desc
      }
    })

    const highlightNodes1 = []
    const highlightNodes2 = []
    node.descendants((desc) => {
      if (desc.type === schema.nodes.highlight_marker) {
        highlightNodes1.push(desc)
      }
    })
    secondNode.descendants((desc) => {
      if (desc.type === schema.nodes.highlight_marker) {
        highlightNodes2.push(desc)
      }
    })

    const commentNodes1 = []
    const commentsNodes2 = []
    node.descendants((desc) => {
      if (desc.type === schema.nodes.comment) {
        commentNodes1.push(desc)
      }
    })
    secondNode.descendants((desc) => {
      if (desc.type === schema.nodes.comment) {
        commentsNodes2.push(desc)
      }
    })
    jats = await readAndParseFixture('jats-import.xml')

    const thirdNode = createArticleNode(jats)
    const fourthNode = createArticleNode()

    expect(node).toMatchSnapshot()
  }, 100000000000)

  test('parses JATS AuthorQueries example to Manuscripts models', async () => {
    const jats = await readAndParseFixture('jats-document.xml')
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
