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

import {
  Journal,
  Manuscript,
  Model,
  ObjectTypes,
  Title,
} from '@manuscripts/json-schema'

import { Decoder } from './decode'
import { ManuscriptModel } from './models'
import { hasObjectType } from './object-types'

export interface ProjectBundle {
  version: string
  data: Model[]
}

export const parseProjectBundle = (
  projectBundle: ProjectBundle,
  manuscriptID?: string,
) => {
  const manuscriptData = manuscriptID
    ? (projectBundle.data as ManuscriptModel[]).filter(
        (doc) => !doc.manuscriptID || doc.manuscriptID === manuscriptID
      )
    : projectBundle.data

  const modelMap: Map<string, Model> = new Map()

  for (const component of manuscriptData) {
    modelMap.set(component._id, component)
  }

  const decoder = new Decoder(modelMap)

  const doc = decoder.createArticleNode()

  return { doc, modelMap }
}

const isManuscript = hasObjectType<Manuscript>(ObjectTypes.Manuscript)

export const findManuscript = (modelMap: Map<string, Model>): Manuscript => {
  for (const model of modelMap.values()) {
    if (isManuscript(model)) {
      return model
    }
  }

  throw new Error('No manuscript found')
}

const isJournal = hasObjectType<Journal>(ObjectTypes.Journal)

export const findJournal = (modelMap: Map<string, Model>) => {
  for (const model of modelMap.values()) {
    if (isJournal(model)) {
      return model
    }
  }

  return null
}

const isManuscriptModel = (model: Model): model is ManuscriptModel =>
  'manuscriptID' in model

export const findManuscriptModelByType = <T extends ManuscriptModel>(
  modelMap: Map<string, Model>,
  manuscript: Manuscript,
  objectType: ObjectTypes
): T | undefined => {
  for (const model of modelMap.values()) {
    if (
      model.objectType === objectType &&
      isManuscriptModel(model) &&
      manuscript._id === model.manuscriptID
    ) {
      return model as T
    }
  }
}

export const findManuscriptById = (
  modelMap: Map<string, Model>,
  manuscriptID: string
): Manuscript => {
  const manuscript: Model | undefined = modelMap.get(manuscriptID)

  if (manuscript && isManuscript(manuscript)) {
    return manuscript as Manuscript
  }

  throw new Error(
    `There is no manuscript found for the following _id (${manuscriptID})`
  )
}

const isTitle = hasObjectType<Title>(ObjectTypes.Journal)

export const findTitle = (modelMap: Map<string, Model>): Title => {
  for (const model of modelMap.values()) {
    if (isTitle(model)) {
      return model
    }
  }

  throw new Error('No Title found')
}
