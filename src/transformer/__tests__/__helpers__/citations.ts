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
  Manuscript,
  Model,
  ObjectTypes,
  ParagraphElement,
  Project,
  Section,
  Titles,
} from '@manuscripts/json-schema'

export const createTestModelMapWithCitations = () => {
  const modelMap = new Map<string, Model>()

  const project: Project = {
    objectType: ObjectTypes.Project,
    _id: 'MPProject:1',
    createdAt: 0,
    updatedAt: 0,
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
  }

  modelMap.set(manuscript._id, manuscript)

  const titles: Titles = {
    objectType: ObjectTypes.Titles,
    _id: 'MPTitles:1',
    title: 'main title',
    subtitle: 'subtitle',
    runningTitle: 'runningTitle',
    createdAt: 0,
    updatedAt: 0,
    placeholder: 'Insert title here...',
    manuscriptID: manuscript._id,
    containerID: project._id,
  }
  modelMap.set(titles._id, titles)

  const bibliographyItem: BibliographyItem = {
    objectType: ObjectTypes.BibliographyItem,
    _id: 'MPBibliographyItem:1',
    type: 'article-journal',
    createdAt: 0,
    updatedAt: 0,
    containerID: project._id,
    manuscriptID: manuscript._id,
  }

  const paragraphWithCitation: ParagraphElement = {
    objectType: ObjectTypes.ParagraphElement,
    _id: 'MPParagraphElement:1',
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
    elementType: 'p',
    paragraphStyle: 'MPParagraphStyle:1',
    contents: `<p xmlns="http://www.w3.org/1999/xhtml" id="MPParagraphElement:1" class="MPElement MPParagraphStyle_1" data-object-type="MPParagraphElement">This sentence contains a citation<span class="citation" data-reference-id="${bibliographyItem._id}">1</span>.</p>`,
  }

  modelMap.set(paragraphWithCitation._id, paragraphWithCitation)

  const paragraphWithLink: ParagraphElement = {
    objectType: ObjectTypes.ParagraphElement,
    _id: 'MPParagraphElement:2',
    createdAt: 0,
    updatedAt: 0,
    manuscriptID: manuscript._id,
    containerID: project._id,
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
    priority: 1,
    path: ['MPSection:1'],
    elementIDs: [paragraphWithCitation._id, paragraphWithLink._id],
    generatedLabel: true,
    title: 'A section',
  }

  modelMap.set(section._id, section)

  return modelMap
}
