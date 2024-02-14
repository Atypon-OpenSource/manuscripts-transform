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
    class: {
      default: null,
      setDOMAttr(value, attrs) {
        if (value) {
          attrs['class'] = value
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

export const table = {
  ...tableNodes.table,
  attrs: {
    ...tableNodes.table.attrs,
    id: { default: '' },
    dataTracked: { default: null },
    comments: { default: null },
  },
}
const tableCell = tableNodes.table_cell
tableCell.toDOM = (node: any) => {
  if (!node.textContent) {
    node.attrs.class = 'placeholder'
  }
  if (tableNodes.table_cell.toDOM) {
    return tableNodes.table_cell.toDOM(node)
  }
  return ['td']
}
const tableHeader = tableNodes.table_cell
tableHeader.toDOM = (node: any) => {
  if (!node.textContent) {
    node.attrs.class = 'placeholder'
  }
  if (tableNodes.table_header.toDOM) {
    return tableNodes.table_header.toDOM(node)
  }
  return ['th']
}
export const tableRow = tableNodes.table_row

export { tableHeader, tableCell }
