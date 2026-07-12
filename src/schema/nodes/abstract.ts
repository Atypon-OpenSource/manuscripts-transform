/*!
 * © 2026 Atypon Systems LLC
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

export interface AbstractAttrs {
  id: string
  category: string
}

export interface AbstractNode extends ManuscriptNode {
  attrs: AbstractAttrs
}

export const abstract: NodeSpec = {
  content: 'section_label? section_title (paragraph | element)* sections*',
  attrs: {
    id: { default: '' },
    category: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.abstract',
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
    const abstractNode = node as AbstractNode
    const { id, category } = abstractNode.attrs

    const attrs: { [key: string]: string } = { id, class: 'abstract' }

    if (category) {
      attrs['data-category'] = category
    }

    return ['section', attrs, 0]
  },
}

export const isAbstractNode = (node: ManuscriptNode): node is AbstractNode =>
  node.type === node.type.schema.nodes.abstract
