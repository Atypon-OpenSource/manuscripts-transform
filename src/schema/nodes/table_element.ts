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
  paragraphStyle: string
  tableStyle: string
  label: string
  suppressCaption: boolean
  suppressFooter: boolean
  suppressHeader: boolean
  expandListing: boolean
}

export interface TableElementNode extends ManuscriptNode {
  attrs: Attrs
}

export const tableElement: NodeSpec = {
  content:
    '(table | placeholder) figcaption? footnotes_element? (listing | placeholder)',
  attrs: {
    id: { default: '' },
    paragraphStyle: { default: '' },
    tableStyle: { default: '' },
    label: { default: '' },
    suppressCaption: { default: false },
    suppressFooter: { default: false },
    suppressHeader: { default: false },
    expandListing: { default: false },
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
          paragraphStyle: element.getAttribute('data-paragraph-style') || '',
          tableStyle: element.getAttribute('data-table-style') || '',
          // table: table ? table.id : null,
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
        'data-paragraph-style': tableElementNode.attrs.paragraphStyle,
        'data-table-style': tableElementNode.attrs.tableStyle,
      },
      0,
    ]
  },
}
