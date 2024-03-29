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
  Affiliation,
  Attribution,
  AuthorNotes,
  BibliographicDate,
  BibliographicName,
  BibliographyElement,
  BibliographyItem,
  Color,
  CommentAnnotation,
  Contribution,
  Contributor,
  ContributorRole,
  Corresponding,
  ElementsOrder,
  EmbeddedModel,
  Figure,
  Footnote,
  FootnotesOrder,
  Journal,
  Keyword,
  KeywordGroup,
  Manuscript,
  ManuscriptNote,
  ObjectTypes,
  ParagraphElement,
  Project,
  Section,
  Supplement,
  Titles,
} from '@manuscripts/json-schema'
import serializeToXML from 'w3c-xmlserializer'

import { ManuscriptNodeType, schema } from '../schema'
import { FootnotesOrderIndexList } from './footnotes-order'
import { generateID } from './id'
import { CommentSelector, ManuscriptModel, ModelAttachment } from './models'
import { timestamp } from './timestamp'

export type Build<T> = Pick<T, Exclude<keyof T, keyof ManuscriptModel>> & {
  _id: string
  objectType: string
  contributions?: Contribution[]
}

// export interface EmbeddedModel {
//   _id: string
//   objectType: string
// }

export type BuildEmbedded<T extends EmbeddedModel, O> = Pick<
  T,
  Exclude<keyof T, keyof ManuscriptModel>
> & {
  _id: string
  objectType: O
}

export const buildProject = (owner: string): Build<Project> => ({
  _id: generateID(ObjectTypes.Project),
  objectType: ObjectTypes.Project,
  owners: [owner],
  writers: [],
  viewers: [],
  title: '',
})

export const buildManuscript = (): Build<Manuscript> => ({
  _id: generateID(ObjectTypes.Manuscript),
  objectType: ObjectTypes.Manuscript,
})

export type ContributorRoleType = 'author'

export const buildContributor = (
  bibliographicName: BibliographicName,
  role: ContributorRoleType = 'author',
  priority = 0,
  userID?: string,
  invitationID?: string
): Build<Contributor> => ({
  _id: generateID(ObjectTypes.Contributor),
  objectType: ObjectTypes.Contributor,
  priority,
  role,
  affiliations: [],
  bibliographicName: buildBibliographicName(bibliographicName),
  userID,
  invitationID,
})

export const buildBibliographyItem = (
  data: Partial<Build<BibliographyItem>>
): Build<BibliographyItem> => ({
  ...data,
  type: data.type || 'article-journal',
  _id: generateID(ObjectTypes.BibliographyItem),
  objectType: ObjectTypes.BibliographyItem,
})

export const buildBibliographicName = (
  data: Partial<BibliographicName>
): BuildEmbedded<BibliographicName, ObjectTypes.BibliographicName> => ({
  ...data,
  _id: generateID(ObjectTypes.BibliographicName),
  objectType: ObjectTypes.BibliographicName,
})

export const buildBibliographicDate = (
  data: Partial<BibliographicDate>
): BuildEmbedded<BibliographicDate, ObjectTypes.BibliographicDate> => ({
  ...data,
  _id: generateID(ObjectTypes.BibliographicDate),
  objectType: ObjectTypes.BibliographicDate,
})

export const buildBibliographyElement = (
  bibliographyItems: BibliographyItem[]
): Build<BibliographyElement> => ({
  _id: generateID(ObjectTypes.BibliographyElement),
  objectType: ObjectTypes.BibliographyElement,
  contents: '',
  elementType: 'div',
  containedObjectIDs: bibliographyItems.map((b) => b._id),
})

// TODO: remove this and treat Keyword as abstract
export const buildKeyword = (name: string): Build<Keyword> => ({
  _id: generateID(ObjectTypes.Keyword),
  objectType: ObjectTypes.Keyword,
  name,
})

export const buildKeywordGroup = (attributes: {
  type?: string
  title?: string
  label?: string
}): Build<KeywordGroup> => ({
  _id: generateID(ObjectTypes.KeywordGroup),
  objectType: ObjectTypes.KeywordGroup,
  ...(attributes.type && { type: attributes.type }),
  ...(attributes.title && { title: attributes.title }),
  ...(attributes.label && { label: attributes.label }),
})

export const buildFigure = (blob: Blob): Build<Figure & ModelAttachment> => ({
  _id: generateID(ObjectTypes.Figure),
  objectType: ObjectTypes.Figure,
  contentType: blob.type,
  src: window.URL.createObjectURL(blob),
  attachment: {
    id: 'image',
    type: blob.type,
    data: blob,
  },
})

export const buildAffiliation = (
  institution: string,
  priority = 0
): Build<Affiliation> => ({
  _id: generateID(ObjectTypes.Affiliation),
  objectType: ObjectTypes.Affiliation,
  institution,
  priority,
})

export const buildSupplementaryMaterial = (
  title: string,
  href: string
): Build<Supplement> => ({
  _id: generateID(ObjectTypes.Supplement),
  objectType: ObjectTypes.Supplement,
  title,
  href,
})

export const buildComment = (
  target: string,
  contents = '',
  selector?: CommentSelector,
  contributions?: Contribution[],
  annotationColor?: string
): Build<CommentAnnotation> => ({
  _id: generateID(ObjectTypes.CommentAnnotation),
  objectType: ObjectTypes.CommentAnnotation,
  target,
  selector,
  contents,
  contributions,
  annotationColor,
})

export const buildNote = (
  target: string,
  source: 'EMAIL' | 'EDITOR' | 'DASHBOARD',
  contents = ''
): Build<ManuscriptNote> => ({
  _id: generateID(ObjectTypes.ManuscriptNote),
  objectType: ObjectTypes.ManuscriptNote,
  target,
  source,
  contents,
})

export const buildFootnote = (
  containingObject: string,
  contents: string,
  kind: 'footnote' | 'endnote' = 'footnote'
): Build<Footnote> => ({
  _id: generateID(ObjectTypes.Footnote),
  objectType: ObjectTypes.Footnote,
  containingObject: containingObject || undefined,
  contents,
  kind,
})
export const buildAuthorNotes = (
  containedObjectIDs: string[]
): Build<AuthorNotes> => ({
  _id: generateID(ObjectTypes.AuthorNotes),
  objectType: ObjectTypes.AuthorNotes,
  containedObjectIDs: containedObjectIDs,
})

export const buildFootnotesOrder = (
  footnotesList: FootnotesOrderIndexList,
  containedObjectID: string
): Build<FootnotesOrder> => ({
  _id: generateID(ObjectTypes.FootnotesOrder),
  objectType: ObjectTypes.FootnotesOrder,
  footnotesList,
  containedObjectID,
})

export const buildCorresp = (contents: string): Build<Corresponding> => ({
  _id: generateID(ObjectTypes.Corresponding),
  objectType: ObjectTypes.Corresponding,
  contents,
})

export const buildSection = (
  priority = 0,
  path: string[] = []
): Build<Section> => {
  const id = generateID(ObjectTypes.Section)

  return {
    _id: id,
    objectType: ObjectTypes.Section,
    priority,
    path: path.concat(id),
  }
}

export const buildParagraph = (innerHTML = ''): Build<ParagraphElement> => {
  const _id = generateID(ObjectTypes.ParagraphElement)
  const element = document.createElementNS(null, 'p')
  element.setAttribute('id', _id)
  if (innerHTML) {
    element.innerHTML = innerHTML
  }
  const contents = serializeToXML(element)
  return {
    _id,
    objectType: ObjectTypes.ParagraphElement,
    elementType: 'p',
    contents,
  }
}

export const buildColor = (value: string, priority: number): Build<Color> => ({
  _id: generateID(ObjectTypes.Color),
  objectType: ObjectTypes.Color,
  priority,
  value,
})

export const buildContribution = (profileID: string): Contribution => ({
  _id: generateID(ObjectTypes.Contribution),
  objectType: ObjectTypes.Contribution,
  profileID,
  timestamp: timestamp(),
})

export const buildContributorRole = (name: string): Build<ContributorRole> => ({
  _id: generateID(ObjectTypes.ContributorRole),
  objectType: ObjectTypes.ContributorRole,
  name,
})

export const buildAttribution = (): Build<Attribution> => ({
  _id: generateID(ObjectTypes.Attribution),
  objectType: ObjectTypes.Attribution,
})

export const buildJournal = (): Build<Journal> => ({
  _id: generateID(ObjectTypes.Journal),
  objectType: ObjectTypes.Journal,
})

export type AuxiliaryObjects =
  | 'MPFigureElement'
  | 'MPTableElement'
  | 'MPListingElement'
  | 'MPEquationElement'

export const auxiliaryObjectTypes = new Set<ManuscriptNodeType>([
  schema.nodes.figure_element,
  schema.nodes.table_element,
  schema.nodes.equation_element,
  schema.nodes.listing_element,
])

export const buildElementsOrder = (
  elementType: AuxiliaryObjects
): Build<ElementsOrder> => ({
  _id: generateID(ObjectTypes.ElementsOrder),
  objectType: ObjectTypes.ElementsOrder,
  elementType: elementType,
  elements: [],
})

export const buildTitles = (title?: string): Build<Titles> => ({
  _id: generateID(ObjectTypes.Titles),
  objectType: ObjectTypes.Titles,
  title: title || '',
})
