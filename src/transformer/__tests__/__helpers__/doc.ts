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

import { Model } from '@manuscripts/json-schema'

import projectDump from '../../../__tests__/data/project-dump.json'
import { Decoder } from '../../decode'

export const createTestModelMap = (): Map<string, Model> => {
  const modelMap: Map<string, Model> = new Map()

  for (const component of projectDump.data as Model[]) {
    modelMap.set(component._id, component)
  }

  return modelMap
}

export const createTestDoc = () => {
  const modelMap = createTestModelMap()

  const decoder = new Decoder(modelMap)

  return decoder.createArticleNode()
}
