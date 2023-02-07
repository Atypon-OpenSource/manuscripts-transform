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
  BibliographyItem,
  Citation,
  Manuscript,
  Model,
  ObjectTypes,
  ParagraphElement,
  Project,
  Section,
} from '@manuscripts/json-schema'

export const createTestModelMapWithCitations = () => {
  const modelMap = new Map<string, Model>()

  const project: Project = {
    objectType: ObjectTypes.Project,
    _id: 'MPProject:1',
    createdAt: 0,
    updatedAt: 0,
    sessionID: 'test',
    owners: [],
    writers: [],
    viewers: [],
  }

  const manuscript: Manuscript = {
    objectType: ObjectTypes.Manuscript,
    _id: 'MPManuscript:1',
    createdAt: 0,
    updatedAt: 0,
    containerID: project._id,
    sessionID: 'test',
  }

  modelMap.set(manuscript._id, manuscript)

  const bibliographyItem: BibliographyItem = {
    objectType: ObjectTypes.BibliographyItem,
    _id: 'MPBibliographyItem:1',
    type: 'article-journal',
    createdAt: 0,
    updatedAt: 0,
    containerID: project._id,
    sessionID: 'test',
    manuscriptID: 'manuscriptX',
  }

  const paragraphCitation: Citation = {
    objectType: ObjectTypes.Citation,
    _id: 'MPCitation:1',
    containingObject: 'MPParagraphElement:1',
    embeddedCitationItems: [
      {
        objectType: ObjectTypes.CitationItem,
        _id: 'MPCitationItem:1',
        bibliographyItem: bibliographyItem._id,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
    sessionID: 'test',
  }

  modelMap.set(paragraphCitation._id, paragraphCitation)

  const paragraphWithCitation: ParagraphElement = {
    objectType: ObjectTypes.ParagraphElement,
    _id: 'MPParagraphElement:1',
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
    sessionID: 'test',
    elementType: 'p',
    paragraphStyle: 'MPParagraphStyle:1',
    contents: `<p xmlns="http://www.w3.org/1999/xhtml" id="MPParagraphElement:1" class="MPElement MPParagraphStyle_1" data-object-type="MPParagraphElement">This sentence contains a citation<span class="citation" data-reference-id="${paragraphCitation._id}">1</span>.</p>`,
  }

  modelMap.set(paragraphWithCitation._id, paragraphWithCitation)

  const paragraphWithLink: ParagraphElement = {
    objectType: ObjectTypes.ParagraphElement,
    _id: 'MPParagraphElement:2',
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
    sessionID: 'test',
    elementType: 'p',
    paragraphStyle: 'MPParagraphStyle:1',
    contents: `<p xmlns="http://www.w3.org/1999/xhtml" id="MPParagraphElement:1" class="MPElement MPParagraphStyle_1" data-object-type="MPParagraphElement">This sentence contains a citation<span class="citation" data-href="https://example.com">example.com</span>.</p>`,
  }

  modelMap.set(paragraphWithLink._id, paragraphWithLink)

  const section: Section = {
    objectType: ObjectTypes.Section,
    _id: 'MPSection:1',
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
    sessionID: 'test',
    priority: 1,
    path: ['MPSection:1'],
    elementIDs: [paragraphWithCitation._id, paragraphWithLink._id],
    generatedLabel: true,
    title: 'A section',
  }

  modelMap.set(section._id, section)

  return modelMap
}
