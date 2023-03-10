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

import { ObjectTypes } from '@manuscripts/json-schema'
import { v4 as uuid } from 'uuid'

import { ManuscriptNodeType } from '../schema'
import { nodeTypesMap } from './node-types'
import { ExtraObjectTypes } from './object-types'

export const generateNodeID = (type: ManuscriptNodeType) => {
  return nodeTypesMap.get(type) + ':' + uuid().toUpperCase()
}

export const generateID = (objectType: ObjectTypes | ExtraObjectTypes) => {
  return objectType + ':' + uuid().toUpperCase()
}
