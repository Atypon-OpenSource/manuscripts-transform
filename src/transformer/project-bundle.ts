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
  Titles,
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
  manuscriptID?: string
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

const isTitle = hasObjectType<Titles>(ObjectTypes.Titles)

export const findTitles = (modelMap: Map<string, Model>): Titles => {
  for (const model of modelMap.values()) {
    if (isTitle(model)) {
      return model
    }
  }
  // If no title is found, return a default title
  const defaultTitle: Titles = {
    _id: 'MPTitles:8EB79C14-9F61-483A-902F-A0B8EF5973C1',
    createdAt: 1538472121.690101,
    updatedAt: 1538472121.690101,
    objectType: 'MPTitles',
    title: 'main title',
    subtitle: 'subtitle',
    runningTitle: 'running title',
    manuscriptID: 'MPManuscript:E3830344-E77B-42BA-BD77-3E95489712A0',
    containerID: 'MPProject:1',
  }

  return defaultTitle
}
