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

export interface TableAttrs {
  id: string
  altText: string
  longDesc: string
}

export interface TableElementNode extends ManuscriptNode {
  attrs: TableAttrs
}

export const tableElement: NodeSpec = {
  content:
    ' figcaption? (table | placeholder) table_colgroup? table_element_footer? (listing | placeholder)',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
    altText: { default: '' },
    longDesc: { default: '' },
  },
  selectable: false,
  group: 'block element executable',
  parseDOM: [
    {
      tag: 'figure.table',
      getAttrs: (dom) => {
        const element = dom as HTMLTableElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const tableElementNode = node as TableElementNode

    return [
      'figure',
      {
        class: 'table', // TODO: suppress-header, suppress-footer?
        id: tableElementNode.attrs.id,
      },
      0,
    ]
  },
}

export const isTableElementNode = (
  node: ManuscriptNode
): node is TableElementNode =>
  node.type === node.type.schema.nodes.table_element
