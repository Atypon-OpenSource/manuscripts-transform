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

import { TableNodes, tableNodes, TableNodesOptions } from 'prosemirror-tables'

const tableOptions: TableNodesOptions = {
  tableGroup: 'block',
  cellContent: 'inline*',
  cellAttributes: {
    placeholder: { default: 'Data' },
    styles: { default: {} },
    valign: { default: null },
    align: { default: null },
    scope: { default: null },
    style: { default: null },
  },
}

export const tnodes: TableNodes = tableNodes(tableOptions)

export const table = {
  ...tnodes.table,
  attrs: {
    ...tnodes.table.attrs,
    id: { default: '' },
  },
}
export const tableRow = tnodes.table_row
export const tableCell = tnodes.table_cell
export const tableHeader = tnodes.table_header
