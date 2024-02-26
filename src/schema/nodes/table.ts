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
import {
  TableNodes,
  tableNodes as createTableNodes,
  TableNodesOptions,
} from 'prosemirror-tables'

const tableOptions: TableNodesOptions = {
  cellContent: 'inline*',
  cellAttributes: {
    placeholder: {
      default: 'Data',
      getFromDOM(dom) {
        return dom.getAttribute('data-placeholder-text') || ''
      },
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['data-placeholder-text'] = value
        }
      },
    },
    valign: {
      default: null,
      getFromDOM(dom) {
        return dom.getAttribute('valign')
      },
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['valign'] = value
        }
      },
    },
    align: {
      default: null,
      getFromDOM(dom) {
        return dom.getAttribute('align')
      },
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['align'] = value
        }
      },
    },
    scope: {
      default: null,
      getFromDOM(dom) {
        return dom.getAttribute('scope')
      },
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['scope'] = value
        }
      },
    },
    style: {
      default: null,
      getFromDOM(dom) {
        return dom.getAttribute('style')
      },
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['style'] = value
        }
      },
    },
  },
}

const tableNodes: TableNodes = createTableNodes(tableOptions)

// this is based on prsemirror-tables schema
export const table: NodeSpec = {
  attrs: {
    id: { default: '' },
  },
  content: 'table_row+',
  tableRole: 'table',
  isolating: true,
  group: 'block',
  parseDOM: [
    {
      tag: 'table',
      getAttrs: (p) => {
        const dom = p as HTMLElement
        return {
          id: dom.getAttribute('id'),
        }
      },
    },
  ],
  toDOM(node) {
    return [
      'table',
      {
        id: node.attrs.id,
      },
      ['tbody', 0],
    ]
  },
}
export const tableRow = tableNodes.table_row
export const tableCell = tableNodes.table_cell
export const tableHeader = tableNodes.table_header
