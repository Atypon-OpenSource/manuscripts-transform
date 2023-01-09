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
  CommentAnnotation,
  Figure,
  Manuscript,
  manuscriptIDTypes,
  Model,
  ObjectTypes,
  Table,
} from '@manuscripts/json-schema'

import { ManuscriptModel, UserProfileWithAvatar } from './models'

export enum ExtraObjectTypes {
  PlaceholderElement = 'MPPlaceholderElement',
}

export const elementObjects = [
  ObjectTypes.BibliographyElement,
  ObjectTypes.EquationElement,
  ObjectTypes.FigureElement,
  ObjectTypes.FootnotesElement,
  ObjectTypes.ListElement,
  ObjectTypes.ListingElement,
  ObjectTypes.ParagraphElement,
  ObjectTypes.TableElement,
  ObjectTypes.TOCElement,
]

export const manuscriptObjects = [
  ObjectTypes.Affiliation,
  ObjectTypes.Citation,
  ObjectTypes.CommentAnnotation,
  ObjectTypes.Contributor,
  ObjectTypes.Footnote,
  ObjectTypes.InlineMathFragment,
  ObjectTypes.Section,
].concat(elementObjects) // TODO: remove elementObjects if they don't need `manuscriptID`

export const isManuscriptModel = (model: Model): model is ManuscriptModel => {
  // TODO: check all required fields
  if (!model.objectType) {
    throw new Error('Model must have objectType')
  }

  return manuscriptIDTypes.has(model.objectType)
}

export const hasObjectType =
  <T extends Model>(objectType: string) =>
  (model: Model): model is T =>
    model.objectType === objectType

export const isFigure = hasObjectType<Figure>(ObjectTypes.Figure)
export const isManuscript = hasObjectType<Manuscript>(ObjectTypes.Manuscript)
export const isTable = hasObjectType<Table>(ObjectTypes.Table)
export const isUserProfile = hasObjectType<UserProfileWithAvatar>(
  ObjectTypes.UserProfile
)
export const isCommentAnnotation = hasObjectType<CommentAnnotation>(
  ObjectTypes.CommentAnnotation
)
