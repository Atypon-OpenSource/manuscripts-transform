/*!
 * © 2020 Atypon Systems LLC
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

import { ManuscriptNodeType } from './types'

export const GROUP_BLOCK = 'block'
export const GROUP_ELEMENT = 'element'
export const GROUP_EXECUTABLE = 'executable'
export const GROUP_LIST = 'list'
export const GROUP_SECTION = 'sections'

export const hasGroup = (
  nodeType: ManuscriptNodeType,
  groupName: string
): boolean => {
  const { group } = nodeType.spec

  if (!group) {
    return false
  }

  return group.split(/\s+/).includes(groupName)
}
