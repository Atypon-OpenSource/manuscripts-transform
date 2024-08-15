/*!
 * © 2024 Atypon Systems LLC
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

import { GROUP_EXECUTABLE, ManuscriptNodeType, schema } from '../'
import { GROUP_BLOCK, GROUP_ELEMENT, GROUP_SECTION, hasGroup } from '../groups'

const sectionNodeTypes: ManuscriptNodeType[] = [
  schema.nodes.section,
  schema.nodes.bibliography_section,
  schema.nodes.toc_section,
]

const elementNodeTypes: ManuscriptNodeType[] = [
  schema.nodes.bibliography_element,
  schema.nodes.blockquote_element,
  schema.nodes.equation_element,
  schema.nodes.figure_element,
  schema.nodes.keywords_element,
  schema.nodes.listing_element,
  schema.nodes.list,
  schema.nodes.paragraph,
  schema.nodes.pullquote_element,
  schema.nodes.table_element,
  schema.nodes.toc_element,
]

const executableNodeTypes: ManuscriptNodeType[] = [
  schema.nodes.figure_element,
  schema.nodes.table_element,
]

describe('groups', () => {
  test('has group', () => {
    for (const nodeType of sectionNodeTypes) {
      expect(hasGroup(nodeType, GROUP_BLOCK)).toBe(true)
      expect(hasGroup(nodeType, GROUP_ELEMENT)).toBe(false)
      expect(hasGroup(nodeType, GROUP_SECTION)).toBe(true)
    }

    for (const nodeType of elementNodeTypes) {
      expect(hasGroup(nodeType, GROUP_BLOCK)).toBe(true)
      expect(hasGroup(nodeType, GROUP_ELEMENT)).toBe(true)
      expect(hasGroup(nodeType, GROUP_SECTION)).toBe(false)
    }

    for (const nodeType of executableNodeTypes) {
      expect(hasGroup(nodeType, GROUP_EXECUTABLE)).toBe(true)
    }
  })
})
