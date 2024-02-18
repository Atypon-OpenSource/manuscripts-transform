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

import { Attrs, Node, NodeSpec } from 'prosemirror-model'
import {
  TableNodes,
  tableNodes as createTableNodes,
  TableNodesOptions,
} from 'prosemirror-tables'

import {
  getTableCellStyles,
  serializeTableCellStyles,
  TableCellStyleKey,
} from '../../lib/table-cell-styles'

// this is needed for the placeholder class
const modifyTableCellSchema = (tableCell: NodeSpec) => {
  const modifiedTableCell = { ...tableCell }
  const originalToDOM = tableCell.toDOM
  if (!originalToDOM) {
    throw new Error(
      `toDOM not found inside ${tableCell}, check for table schema changes in prosemirror-tables`
    )
  }
  modifiedTableCell.toDOM = function (node) {
    const originalArray = originalToDOM.call(this, node)

    if (!Array.isArray(originalArray)) {
      throw new Error(
        `${originalArray} is of type ${typeof originalArray}, check for table schema changes in prosemirror-tables`
      )
    }

    const attrsIndex = originalArray.findIndex(
      (item) => typeof item === 'object' && !Array.isArray(item)
    )

    const modifiedAttrs = { ...originalArray[attrsIndex] }

    if (!node.textContent) {
      modifiedAttrs.class = 'placeholder'
    }

    originalArray[attrsIndex] = modifiedAttrs

    return originalArray
  }

  return modifiedTableCell
}

const modifyTableToDOM = (modifiedTable: NodeSpec) => {
  const originalToDOM = modifiedTable.toDOM
  if (!originalToDOM) {
    throw new Error(
      `toDOM not found inside ${modifiedTable}, check for table schema changes in prosemirror-tables`
    )
  }
  modifiedTable.toDOM = function (node: Node) {
    const originalArray = originalToDOM.call(this, node)
    if (!Array.isArray(originalArray)) {
      throw new Error(
        `${originalArray} is of type ${typeof originalArray}, check for table schema changes in prosemirror-tables`
      )
    }
    const modifiedAttrs = {
      id: node.attrs.id,
      'data-header-rows': String(node.attrs.headerRows),
      'data-footer-rows': String(node.attrs.footerRows),
    }
    // in prosemirror, the second index is the attrs
    if (Array.isArray(originalArray[1])) {
      originalArray.splice(1, 0, modifiedAttrs)
    } else if (typeof originalArray[1] === 'object') {
      originalArray[1] = { ...originalArray[1], ...modifiedAttrs }
    } else {
      throw new Error(
        `toDOM[1] ${
          originalArray[1]
        } is of type ${typeof originalArray[1]}, check for table schema changes in prosemirror-tables`
      )
    }
    return originalArray
  }
}
const modifyTableParseDOM = (modifiedTable: NodeSpec) => {
  if (!modifiedTable.parseDOM || !modifiedTable.parseDOM[0]) {
    throw new Error(
      `parseDOM not found inside ${modifiedTable}, check for table schema changes in prosemirror-tables`
    )
  }
  const originalGetAttrs = modifiedTable.parseDOM[0].getAttrs
  let originalAttrs: Attrs | null | boolean
  modifiedTable.parseDOM[0].getAttrs = function (p) {
    const dom = p as HTMLTableElement
    if (originalGetAttrs) {
      originalAttrs = originalGetAttrs.call(this, p)
    }
    if (originalAttrs && typeof originalAttrs === 'object') {
      return {
        ...originalAttrs,
        id: dom.getAttribute('id'),
        headerRows: dom.dataset && dom.dataset['header-rows'],
        footerRows: dom.dataset && dom.dataset['footer-rows'],
      }
    } else {
      return {
        id: dom.getAttribute('id'),
        headerRows: dom.dataset && dom.dataset['header-rows'],
        footerRows: dom.dataset && dom.dataset['footer-rows'],
      }
    }
  }
}

const modifyTableAttrs = (modifiedTable: NodeSpec, table: NodeSpec) => {
  modifiedTable.attrs = {
    ...table.attrs,
    id: { default: '' },
    dataTracked: { default: null },
    comments: { default: null },
    headerRows: { default: 1 },
    footerRows: { default: 1 },
  }
}

const modifyTableSchema = (table: NodeSpec) => {
  const modifiedTable = { ...table }
  modifyTableAttrs(modifiedTable, table)
  modifyTableToDOM(modifiedTable)
  modifyTableParseDOM(modifiedTable)
  return modifiedTable
}
const tableOptions: TableNodesOptions = {
  tableGroup: 'block',
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
    styles: {
      default: {},
      getFromDOM(dom) {
        return getTableCellStyles(dom.style)
      },
      setDOMAttr(value, attrs) {
        const styleString = serializeTableCellStyles(
          value as {
            [key in TableCellStyleKey]?: string | null
          }
        )
        if (styleString) {
          attrs['style'] = value
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

export const tableNodes: TableNodes = createTableNodes(tableOptions)

export const table = modifyTableSchema(tableNodes.table)
export const tableRow = tableNodes.table_row
export const tableCell = modifyTableCellSchema(tableNodes.table_cell)
export const tableHeader = modifyTableCellSchema(tableNodes.table_header)
