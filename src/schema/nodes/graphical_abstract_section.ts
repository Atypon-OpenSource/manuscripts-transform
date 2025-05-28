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

import { Node, NodeSpec } from 'prosemirror-model'

import { chooseSectionCategory } from '../section-utils'
import { SectionCategory } from '../types'

export interface GraphicalAbstractSectionAttrs {
  id: string
  category: string
}

export interface GraphicalAbstractSectionNode extends Node {
  attrs: GraphicalAbstractSectionAttrs
}

export const createGraphicalAbstractSectionNodeSpec = (
  sectionCategories: SectionCategory[]
): NodeSpec => ({
  content: 'section_title (figure_element | placeholder)', // does it need perhaps a special view that limits the figure content? Ask Nick?
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
    category: { default: '' },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.graphical-abstract',
    },
    {
      tag: 'sec[sec-type="abstract-graphical"]',
      getAttrs: (dom) => {
        const element = dom as HTMLElement
        return {
          category: chooseSectionCategory(element, sectionCategories) || '',
        }
      },
    },
    {
      tag: 'sec[sec-type="abstract-key-image"]',
      getAttrs: (dom) => {
        const element = dom as HTMLElement
        return {
          category: chooseSectionCategory(element, sectionCategories) || '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const graphicalAbstractSectionNode = node as GraphicalAbstractSectionNode

    return [
      'section',
      {
        id: graphicalAbstractSectionNode.attrs.id,
        class: 'graphical-abstract',
        spellcheck: 'false',
      },
      0,
    ]
  },
})

export const graphicalAbstractSection: NodeSpec =
  createGraphicalAbstractSectionNodeSpec([])

export const isGraphicalAbstractSectionNode = (
  node: Node
): node is GraphicalAbstractSectionNode =>
  node.type === node.type.schema.nodes.graphical_abstract_section
