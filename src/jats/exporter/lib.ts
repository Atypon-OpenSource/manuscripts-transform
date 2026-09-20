/*!
 * © 2026 Atypon Systems LLC
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

/*!
 * © 2026 Atypon Systems LLC
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

import { ManuscriptNodeType, schema } from '../../schema'
import { IDGenerator } from '../types'

export const normalizeID = (id: string) => id.replace(/:/g, '_')

export const createCounter = () => {
  const counts = new Map<string, number>()

  return {
    increment: (field: string) => {
      const value = counts.get(field)
      const newValue = value === undefined ? 1 : value + 1
      counts.set(field, newValue)
      return newValue
    },
  }
}

export const createDefaultIDGenerator = (): IDGenerator => {
  const counter = createCounter()

  return async (element: Element) => {
    const value = String(counter.increment(element.nodeName))

    return `${element.localName}-${value}`
  }
}

export const chooseRefType = (type: ManuscriptNodeType): string | undefined => {
  switch (type) {
    case schema.nodes.figure:
    case schema.nodes.figure_element:
      return 'fig'

    case schema.nodes.footnote:
      return 'fn'

    case schema.nodes.table:
    case schema.nodes.table_element:
      return 'table'

    case schema.nodes.section:
    case schema.nodes.abstract:
      return 'sec'

    case schema.nodes.equation:
    case schema.nodes.equation_element:
      return 'disp-formula'

    case schema.nodes.supplement:
      return 'supplementary-material'
  }
}
