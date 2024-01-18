/*!
 * © 2024 Atypon Systems LLC
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

import { Decoder } from '../../transformer'
import { parseJATSArticle } from '../importer'
import { readAndParseFixture } from './files'

export const getModelMapFromXML = async (fileName: string) => {
  const models = await parseJATSArticle(await readAndParseFixture(fileName))
  const modelMap: Map<string, Model> = new Map()
  for (const model of models) {
    modelMap.set(model._id, model)
  }
  return modelMap
}

export const getDocFromModelMap = async (modelMap: Map<string, Model>) => {
  const decoder = new Decoder(modelMap)
  return decoder.createArticleNode()
}
