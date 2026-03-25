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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  category: string
}

export interface SectionNode extends ManuscriptNode {
  attrs: Attrs
}

export const section: NodeSpec = {
  // NOTE: the schema needs paragraphs to be the default type, so they must explicitly come first
  content: 'section_label? section_title (paragraph | element)* sections*',
  attrs: {
    id: { default: '' },
    category: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section',
      getAttrs: (dom) => {
        const element = dom as HTMLElement

        return {
          id: element.getAttribute('id') || '',
          category: element.getAttribute('data-category') || '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const sectionNode = node as SectionNode

    const { id, category } = sectionNode.attrs

    const attrs: { [key: string]: string } = { id }

    if (category) {
      attrs['data-category'] = node.attrs.category
    }

    return ['section', attrs, 0]
  },
}

export const isSectionNode = (node: ManuscriptNode): node is SectionNode =>
  node.type === node.type.schema.nodes.section
