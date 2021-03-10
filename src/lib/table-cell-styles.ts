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

import _pickBy from 'lodash.pickby'

// TODO: fix all the tests and test this unit

export type AllowedTableCellStyles =
  | 'backgroundColor'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
  | 'borderLeft'
  | 'verticalAlign'
  | 'textAlign'

export const TABLE_CELL_STYLES = [
  'backgroundColor',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'verticalAlign',
  'textAlign',
]

const dashify = (str: string) => {
  return str
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\W/g, (m) => (/[À-ž]/.test(m) ? m : '-'))
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export const serializeTableCellStyles = (
  styles: { [key in AllowedTableCellStyles]?: string | null }
) => {
  return (Object.keys(styles) as Array<AllowedTableCellStyles>)
    .map((key) => styles[key] && `${dashify(key)}: ${styles[key]}`)
    .filter(Boolean)
    .join('; ')
}

export const getTableCellStyles = (styles: CSSStyleDeclaration) => {
  return _pickBy(
    styles,
    (value, key) => TABLE_CELL_STYLES.includes(key) && value
  )
}
