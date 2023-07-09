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

import {
  getTableCellStyles,
  serializeTableCellStyles,
  TableCellStyleKey,
} from '../../lib/table-cell-styles'
import { getTrimmedAttribute } from '../../lib/utils'
import { ManuscriptNode, TableNodeSpec } from '../types'

// NOTE: keep this method as close to the original as possible, for ease of updating
const getCellAttrs = (p: Node | string) => {
  const dom = p as HTMLTableCellElement

  const celltype = dom.tagName.toLowerCase()
  const widthAttr = getTrimmedAttribute(dom, 'data-colwidth')
  const widths =
    widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
      ? widthAttr.split(',').map((s) => Number(s))
      : null
  const colspan = Number(getTrimmedAttribute(dom, 'colspan') || 1)
  const valign = getTrimmedAttribute(dom, 'valign')
  const align = getTrimmedAttribute(dom, 'align')
  const scope = getTrimmedAttribute(dom, 'scope')
  const style = getTrimmedAttribute(dom, 'style')

  return {
    celltype,
    colspan,
    rowspan: Number(getTrimmedAttribute(dom, 'rowspan') || 1),
    colwidth: widths && widths.length === colspan ? widths : null,
    placeholder: getTrimmedAttribute(dom, 'data-placeholder-text') || '',
    styles: getTableCellStyles(dom.style),
    valign,
    align,
    scope,
    style,
  }
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
      //   placeholder: getTrimmedAttribute(dom, 'data-placeholder-text'),
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

export type TableCellStyles = { [key in TableCellStyleKey]?: string | null }

export interface TableCellNode extends ManuscriptNode {
  attrs: {
    celltype: 'td' | 'th'
    colspan: number | null
    rowspan: number | null
    colwidth: number[] | null
    placeholder: string | null
    styles: TableCellStyles
    valign: string | null
    align: string | null
    scope: string | null
    style: string | null
  }
}

export const tableCell: TableNodeSpec = {
  content: 'inline*',
  attrs: {
    celltype: { default: 'td' },
    colspan: { default: 1 },
    rowspan: { default: 1 },
    colwidth: { default: null },
    placeholder: { default: 'Data' }, // TODO: depends on cell type and position
    styles: { default: {} },
    valign: { default: null },
    align: { default: null },
    scope: { default: null },
    style: { default: null },
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
    const tag = tableCellNode.attrs.celltype

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

    if (tableCellNode.attrs.valign) {
      attrs.valign = tableCellNode.attrs.valign
    }

    if (tableCellNode.attrs.align) {
      attrs.align = tableCellNode.attrs.align
    }

    if (tableCellNode.attrs.scope) {
      attrs.scope = tableCellNode.attrs.scope
    }

    if (tableCellNode.attrs.style) {
      attrs.style = tableCellNode.attrs.style
    }

    return [tag, attrs, 0]
  },
}
