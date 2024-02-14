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

import { Attrs, Node } from 'prosemirror-model'
import { MutableAttrs, TableNodes, TableNodesOptions } from 'prosemirror-tables'
interface CellAttrs {
  colspan: number
  rowspan: number
  colwidth: number[] | null
}
import {
  getTableCellStyles,
  serializeTableCellStyles,
  TableCellStyleKey,
} from '../../lib/table-cell-styles'

function getCellAttrs(dom: HTMLElement | string, extraAttrs: Attrs): Attrs {
  if (typeof dom === 'string') {
    return {}
  }

  const widthAttr = dom.getAttribute('data-colwidth')
  const widths =
    widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
      ? widthAttr.split(',').map((s) => Number(s))
      : null
  const colspan = Number(dom.getAttribute('colspan') || 1)
  const result: MutableAttrs = {
    colspan,
    rowspan: Number(dom.getAttribute('rowspan') || 1),
    colwidth: widths && widths.length == colspan ? widths : null,
  } satisfies CellAttrs
  for (const prop in extraAttrs) {
    const getter = extraAttrs[prop].getFromDOM
    const value = getter && getter(dom)
    if (value != null) {
      result[prop] = value
    }
  }
  return result
}

function setCellAttrs(node: Node, extraAttrs: Attrs): Attrs {
  const attrs: MutableAttrs = {}
  if (node.attrs.colspan != 1) {
    attrs.colspan = node.attrs.colspan
  }
  if (node.attrs.rowspan != 1) {
    attrs.rowspan = node.attrs.rowspan
  }
  if (node.attrs.colwidth) {
    attrs['data-colwidth'] = node.attrs.colwidth.join(',')
  }
  if (node.textContent) {
    attrs.class = 'palceholder'
  }
  for (const prop in extraAttrs) {
    const setter = extraAttrs[prop].setDOMAttr
    if (setter) {
      setter(node.attrs[prop], attrs)
    }
  }
  return attrs
}

export function createTableNodes(options: TableNodesOptions): TableNodes {
  const extraAttrs = options.cellAttributes || {}
  const cellAttrs: Record<string, any> = {
    colspan: { default: 1 },
    rowspan: { default: 1 },
    colwidth: { default: null },
  }
  for (const prop in extraAttrs) {
    cellAttrs[prop] = { default: extraAttrs[prop].default }
  }

  return {
    table: {
      content: 'table_row+',
      tableRole: 'table',
      isolating: true,
      group: options.tableGroup,
      parseDOM: [{ tag: 'table' }],
      toDOM() {
        return ['table', ['tbody', 0]]
      },
    },
    table_row: {
      content: '(table_cell | table_header)*',
      tableRole: 'row',
      parseDOM: [{ tag: 'tr' }],
      toDOM() {
        return ['tr', 0]
      },
    },
    table_cell: {
      content: options.cellContent,
      attrs: cellAttrs,
      tableRole: 'cell',
      isolating: true,
      parseDOM: [
        { tag: 'td', getAttrs: (dom) => getCellAttrs(dom, extraAttrs) },
      ],
      toDOM(node) {
        return ['td', setCellAttrs(node, extraAttrs), 0]
      },
    },
    table_header: {
      content: options.cellContent,
      attrs: cellAttrs,
      tableRole: 'header_cell',
      isolating: true,
      parseDOM: [
        { tag: 'th', getAttrs: (dom) => getCellAttrs(dom, extraAttrs) },
      ],
      toDOM(node) {
        return ['th', setCellAttrs(node, extraAttrs), 0]
      },
    },
  }
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
export const tableRow = tableNodes.table_row
export const tableCell = tableNodes.table_cell
export const tableHeader = tableNodes.table_header
