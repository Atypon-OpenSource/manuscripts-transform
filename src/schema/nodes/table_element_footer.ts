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

export interface TableElementFooterAttrs {
  id: string
}

export interface TableElementFooterNode extends Node {
  attrs: TableElementFooterAttrs
}

export const tableElementFooter: NodeSpec = {
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  content: 'general_table_footnote? footnotes_element?',
  group: 'block element',
  parseDOM: [
    {
      tag: 'table-wrap-foot',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: () => ['table-wrap-foot', 0],
}

export const isTableElementFooter = (
  node: Node
): node is TableElementFooterNode =>
  node.type === node.type.schema.nodes.table_element_footer
