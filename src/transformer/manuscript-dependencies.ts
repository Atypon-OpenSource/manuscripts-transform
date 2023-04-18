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
import {
  AuxiliaryObjectReferenceStyle,
  BorderStyle,
  CaptionStyle,
  Color,
  ColorScheme,
  ContributorRole,
  FigureLayout,
  FigureStyle,
  Model,
  ObjectTypes,
  PageLayout,
  ParagraphStyle,
  TableStyle,
} from '@manuscripts/json-schema'

import { generateID } from './id'
import { hasObjectType } from './object-types'
import { loadSharedData } from './shared-data'

export type StyleObject =
  | AuxiliaryObjectReferenceStyle
  | BorderStyle
  | CaptionStyle
  | Color
  | ColorScheme
  | FigureLayout
  | FigureStyle
  | PageLayout
  | ParagraphStyle
  | TableStyle

// NOTE: a template published by a user may define its own, non-bundled models
const isBundledModel = (model: Model) => model.bundled === true

const loadBundledData = async <T extends Model>(file: string): Promise<T[]> => {
  const models = await loadSharedData<T>(file)

  return models.filter(isBundledModel)
}

export const loadStyles = () => loadBundledData<StyleObject>('styles')

export const loadKeywords = () => loadBundledData<Model>('keywords')

export const loadContributorRoles = () =>
  loadBundledData<ContributorRole>('contributor-roles')

export const fromPrototype = <T extends Model>(model: T) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _rev, ...data } = model

  const output = {
    ...data,
    prototype: _id,
    _id: generateID(model.objectType as ObjectTypes),
  }

  return output as T & { prototype: string }
}

export const getByPrototype = <T extends Model>(
  modelMap: Map<string, Model>,
  prototype: string
): T | undefined => {
  for (const model of modelMap.values()) {
    if (model.prototype === prototype) {
      return model as T
    }
  }
}

const isParagraphStyle = hasObjectType<ParagraphStyle>(
  ObjectTypes.ParagraphStyle
)

const chooseNewDefaultParagraphStyle = (styles: Map<string, StyleObject>) => {
  for (const style of styles.values()) {
    if (isParagraphStyle(style)) {
      if (style.title === 'Body Text') {
        // TODO: something stricter?
        return style
      }
    }
  }
}

export const updatedPageLayout = (
  styleMap: Map<string, StyleObject>,
  pageLayoutID: string
) => {
  const newPageLayout = getByPrototype<PageLayout>(styleMap, pageLayoutID)

  if (!newPageLayout) {
    throw new Error('Page layout not found')
  }

  const newDefaultParagraphStyle =
    getByPrototype<ParagraphStyle>(
      styleMap,
      newPageLayout.defaultParagraphStyle
    ) || chooseNewDefaultParagraphStyle(styleMap)

  if (!newDefaultParagraphStyle) {
    throw new Error('Default paragraph style not found')
  }

  newPageLayout.defaultParagraphStyle = newDefaultParagraphStyle._id

  return newPageLayout
}
