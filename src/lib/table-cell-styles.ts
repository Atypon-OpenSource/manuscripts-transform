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

// TODO: fix all the tests and test this unit

export const TABLE_CELL_STYLES = [
  'backgroundColor',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'verticalAlign',
  'textAlign',
] as const

export type TableCellStyleKey = typeof TABLE_CELL_STYLES[number]

const dashify = (str: string) => {
  return str
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\W/g, (m) => (/[À-ž]/.test(m) ? m : '-'))
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export const serializeTableCellStyles = (styles: {
  [key in TableCellStyleKey]?: string | null
}) => {
  return (Object.keys(styles) as Array<TableCellStyleKey>)
    .map((key) => styles[key] && `${dashify(key)}: ${styles[key]}`)
    .filter(Boolean)
    .join('; ')
}

const isStyleKey = (key: string): key is TableCellStyleKey =>
  TABLE_CELL_STYLES.includes(key as TableCellStyleKey)

export const getTableCellStyles = (styles: CSSStyleDeclaration) => {
  return Object.entries(styles).reduce((acc, [key, value]) => {
    if (isStyleKey(key)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<TableCellStyleKey, string>)
}
