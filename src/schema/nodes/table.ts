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

// adapted from 'prosemirror-tables'

import { getTrimmedAttribute } from '../../lib/utils'
import { ManuscriptNode, TableNodeSpec } from '../types'
import { CommentNode } from './comment'

export interface TableNode extends ManuscriptNode {
  attrs: {
    id: string
    headerRows: number
    footerRows: number
    comments?: CommentNode[]
  }
}

export const table: TableNodeSpec = {
  content: 'table_colgroup? table_body',
  tableRole: 'table',
  isolating: true,
  group: 'block',
  selectable: false,
  attrs: {
    id: { default: '' },
    headerRows: { default: 1 },
    footerRows: { default: 1 },
    dataTracked: { default: null },
    comments: { default: null },
  },
  parseDOM: [
    {
      tag: 'table',
      getAttrs: (p) => {
        const dom = p as HTMLTableElement

        return {
          id: getTrimmedAttribute(dom, 'id'),
          headerRows: dom.dataset && dom.dataset['header-rows'],
          footerRows: dom.dataset && dom.dataset['footer-rows'],
        }
      },
    },
  ],
  toDOM: (node) => {
    const tableNode = node as TableNode

    return [
      'table',
      {
        id: tableNode.attrs.id,
        'data-header-rows': String(node.attrs.headerRows),
        'data-footer-rows': String(node.attrs.footerRows),
      },
      0,
    ]
  },
}

export const tableBody: TableNodeSpec = {
  content: 'table_row+',
  group: 'block',
  tableRole: 'table',
  parseDOM: [
    {
      tag: 'tbody',
    },
  ],
  toDOM() {
    return ['tbody', 0]
  },
}
