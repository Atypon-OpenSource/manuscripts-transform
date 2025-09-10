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

import { v4 as uuid } from 'uuid'

import { ManuscriptNodeType } from '../schema'

export const generateNodeID = (type: ManuscriptNodeType) => {
  const uniqueID = ':' + uuid().toUpperCase()
  const name =
    'MP' +
    type.name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  return name + uniqueID
}
