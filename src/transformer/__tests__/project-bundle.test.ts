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

import project3 from '../../__tests__/data/project-dump-3.json'
import { ManuscriptNode, ManuscriptNodeType, schema } from '../../schema'
import { parseProjectBundle, ProjectBundle } from '../project-bundle'

test('project bundle with no manuscript parameter', () => {
  const result = parseProjectBundle(project3)
  replaceIdByType(
    result.doc,
    schema.nodes.abstract_core_section,
    'MPSection:abstracts'
  )
  replaceIdByType(result.doc, schema.nodes.body_core_section, 'MPSection:body')
  replaceIdByType(
    result.doc,
    schema.nodes.backmatter_core_section,
    'MPSection:backmatter'
  )
  replaceIdByType(
    result.doc,
    schema.nodes.affiliations_section,
    'MPSection:affiliations'
  )
  replaceIdByType(
    result.doc,
    schema.nodes.contributors_section,
    'MPSection:contributors'
  )
  replaceIdByType(result.doc, schema.nodes.contributor, 'MPSection:contributor')
  replaceIdByType(result.doc, schema.nodes.affiliation, 'MPSection:aff')
  replaceIdByType(result.doc, schema.nodes.keywords_section, 'MPSection:kwd')
  expect(result).toMatchSnapshot('project-bundle')
})

test('project bundle for a specific manuscript', () => {
  const result = parseProjectBundle(
    project3 as ProjectBundle,
    'MPManuscript:BCEB682E-C475-4BF7-9470-D6194D3EF0D8'
  )
  replaceIdByType(
    result.doc,
    schema.nodes.abstract_core_section,
    'MPSection:abstracts'
  )
  replaceIdByType(
    result.doc,
    schema.nodes.contributors_section,
    'MPSection:contSec'
  )
  replaceIdByType(
    result.doc,
    schema.nodes.affiliations_section,
    'MPSection:affSec'
  )
  replaceIdByType(result.doc, schema.nodes.keywords_section, 'MPSection:kwd')
  replaceIdByType(result.doc, schema.nodes.contributor, 'MPSection:cont')
  replaceIdByType(result.doc, schema.nodes.affiliation, 'MPSection:aff')
  replaceIdByType(result.doc, schema.nodes.body_core_section, 'MPSection:body')
  replaceIdByType(
    result.doc,
    schema.nodes.backmatter_core_section,
    'MPSection:backmatter'
  )
  expect(result).toMatchSnapshot('multimanuscript-project-bundle')
})

const replaceIdByType = (
  node: ManuscriptNode,
  type: ManuscriptNodeType,
  id: string
) => {
  node.descendants((childNode) => {
    if (childNode.type === type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(childNode as any).attrs.id = id
    }
  })
}
