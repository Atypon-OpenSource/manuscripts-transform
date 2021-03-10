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

import { NodeSpec } from 'prosemirror-model'

import {
  AllowedTableCellStyles,
  getTableCellStyles,
  serializeTableCellStyles,
} from '../../lib/table-cell-styles'
import { ManuscriptNode } from '../types'

// NOTE: keep this method as close to the original as possible, for ease of updating
const getCellAttrs = (p: Node | string) => {
  const dom = p as HTMLTableCellElement

  const widthAttr = dom.getAttribute('data-colwidth')
  const widths =
    widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
      ? widthAttr.split(',').map((s) => Number(s))
      : null
  const colspan = Number(dom.getAttribute('colspan') || 1)

  return {
    colspan,
    rowspan: Number(dom.getAttribute('rowspan') || 1),
    colwidth: widths && widths.length === colspan ? widths : null,
    placeholder: dom.getAttribute('data-placeholder-text') || '',
    styles: getTableCellStyles(dom.style),
  }
}

interface TableNodeSpec extends NodeSpec {
  tableRole: string
}

export interface TableNode extends ManuscriptNode {
  attrs: {
    id: string
    headerRows: number
    footerRows: number
  }
}

export const table: TableNodeSpec = {
  content: 'table_row+',
  tableRole: 'table',
  isolating: true,
  group: 'block',
  selectable: false,
  attrs: {
    id: { default: '' },
    headerRows: { default: 1 },
    footerRows: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'table',
      getAttrs: (p) => {
        const dom = p as HTMLTableElement

        return {
          id: dom.getAttribute('id'),
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
      ['tbody', 0],
    ]
  },
}

export interface TableRowNode extends ManuscriptNode {
  attrs: {
    placeholder: string
  }
}

export const tableRow: TableNodeSpec = {
  content: 'table_cell+',
  tableRole: 'row',
  attrs: {
    placeholder: { default: '' },
  },
  parseDOM: [
    {
      tag: 'tr',
      priority: 80,
      // getAttrs: (dom: HTMLTableRowElement) => ({
      //   placeholder: dom.getAttribute('data-placeholder-text'),
      // }),
    },
  ],
  toDOM: (node) => {
    const tableRowNode = node as TableRowNode

    const attrs: { [key: string]: string } = {}

    if (tableRowNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = tableRowNode.attrs.placeholder
    }

    return ['tr', attrs, 0]
  },
}

export interface TableCellNode extends ManuscriptNode {
  attrs: {
    colspan: number | null
    rowspan: number | null
    colwidth: number[] | null
    placeholder: string | null
    styles: { [key in AllowedTableCellStyles]?: string | null }
  }
}

export const tableCell: TableNodeSpec = {
  content: 'inline*',
  attrs: {
    colspan: { default: 1 },
    rowspan: { default: 1 },
    colwidth: { default: null },
    placeholder: { default: 'Data' }, // TODO: depends on cell type and position
    styles: { default: {} },
  },
  tableRole: 'cell',
  isolating: true,
  parseDOM: [
    { tag: 'td', getAttrs: getCellAttrs },
    { tag: 'th', getAttrs: getCellAttrs },
  ],
  toDOM: (node) => {
    const tableCellNode = node as TableCellNode

    const attrs: { [attr: string]: string } = {}

    if (tableCellNode.attrs.colspan && tableCellNode.attrs.colspan !== 1) {
      attrs.colspan = String(tableCellNode.attrs.colspan)
    }

    if (tableCellNode.attrs.rowspan && tableCellNode.attrs.rowspan !== 1) {
      attrs.rowspan = String(tableCellNode.attrs.rowspan)
    }

    if (tableCellNode.attrs.colwidth) {
      attrs['data-colwidth'] = tableCellNode.attrs.colwidth.join(',')
    }

    if (tableCellNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = tableCellNode.attrs.placeholder
    }

    if (!tableCellNode.textContent) {
      attrs.class = 'placeholder'
    }

    const styleString = serializeTableCellStyles(tableCellNode.attrs.styles)
    if (styleString) {
      attrs.style = styleString
    }

    return ['td', attrs, 0]
  },
}
