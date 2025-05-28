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
  CellAttributes,
  MutableAttrs,
  TableNodes,
  tableNodes as createTableNodes,
  TableNodesOptions,
} from 'prosemirror-tables'

type getFromDOM = (dom: HTMLElement) => unknown
type setDOMAttr = (value: unknown, attrs: MutableAttrs) => void

function createCellAttribute(
  attributeName: string,
  defaultValue: unknown = null,
  customGetFromDOM?: getFromDOM,
  customSetDOMAttr?: setDOMAttr
): CellAttributes {
  return {
    default: defaultValue,
    getFromDOM(dom) {
      if (customGetFromDOM) {
        return customGetFromDOM(dom)
      }
      return dom.getAttribute(attributeName)
    },
    setDOMAttr(value, attrs) {
      if (customSetDOMAttr) {
        customSetDOMAttr(value, attrs)
      } else if (value) {
        attrs[attributeName] = value
      }
    },
  }
}

const tableOptions: TableNodesOptions = {
  cellContent: 'text_block+',
  cellAttributes: {
    placeholder: createCellAttribute(
      'data-placeholder-text',
      'Data',
      (dom) => dom.getAttribute('data-placeholder-text') || ''
    ),
    valign: createCellAttribute('valign'),
    align: createCellAttribute('align'),
    scope: createCellAttribute('scope'),
    style: createCellAttribute('style'),
    colspan: createCellAttribute(
      'colspan',
      1,
      (dom) => Number(dom.getAttribute('colspan') || 1),
      (value, attrs) => {
        if (value && value !== 1) {
          attrs['colspan'] = String(value)
        }
      }
    ),
    rowspan: createCellAttribute(
      'rowspan',
      1,
      (dom) => Number(dom.getAttribute('rowspan') || 1),
      (value, attrs) => {
        if (value && value !== 1) {
          attrs['rowspan'] = String(value)
        }
      }
    ),
  },
}

const tableNodes: TableNodes = createTableNodes(tableOptions)

// this is based on prsemirror-tables schema with our added attributes
export const table: NodeSpec = {
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
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
export const tableRow: NodeSpec = {
  ...tableNodes.table_row,
  attrs: { 
    ...tableNodes.table_row.attrs, 
    id: { default: '' },
    dataTracked: { default: null } 
  },
}
export const tableCell: NodeSpec = {
  ...tableNodes.table_cell,
  attrs: { 
    ...tableNodes.table_cell.attrs,
    id: { default: '' },
    dataTracked: { default: null } 
  },
}
export const tableHeader: NodeSpec = {
  ...tableNodes.table_header,
  attrs: { 
    ...tableNodes.table_header.attrs,
    id: { default: '' },
    dataTracked: { default: null } 
  },
}
