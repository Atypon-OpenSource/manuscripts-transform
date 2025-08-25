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

import { ActualManuscriptNode, schema, SectionCategory } from '../../schema'
import { markComments } from './jats-comments'
import { JATSDOMParser } from './jats-dom-parser'
import { parseJournal } from './jats-journal-meta-parser'
import { updateDocumentIDs } from './jats-parser-utils'
import {
  addMissingCaptions,
  createAbstracts,
  createAccessibilityItems,
  createAttachments,
  createBackmatter,
  createBody,
  createBoxedElementSection,
  createKeywordsSection,
  createSupplementaryMaterialsSection,
  createTitles,
  fixTables,
  moveAffiliations,
  moveAuthorNotes,
  moveAwards,
  moveCaptionsToEnd,
  moveContributors,
  moveHeroImage,
  moveReferencesToBackmatter,
  orderTableFootnote,
} from './jats-transformations'

const processJATS = (doc: Document, sectionCategories: SectionCategory[]) => {
  const createElement = createElementFn(doc)

  markComments(doc)

  const front = doc.querySelector('front')
  if (!front) {
    return
  }
  addMissingCaptions(doc, createElement)
  createTitles(front, createElement)
  moveContributors(front, createElement)
  moveAffiliations(front, createElement)
  moveAuthorNotes(front, createElement)
  moveAwards(front)

  let body = doc.querySelector('body')
  if (!body) {
    body = createElement('body') as HTMLBodyElement
    doc.appendChild(body)
  }

  moveCaptionsToEnd(body)
  createBoxedElementSection(body, createElement)
  createBody(doc, body, createElement)
  createAbstracts(front, body, createElement)
  createBackmatter(doc, body, sectionCategories, createElement)
  createSupplementaryMaterialsSection(doc, body, createElement)
  createKeywordsSection(doc, body, createElement)
  fixTables(doc, body, createElement)
  orderTableFootnote(doc, body)
  moveHeroImage(doc)
  createAttachments(doc, createElement)
  const back = doc.querySelector('back')
  if (!back) {
    return
  }
  moveReferencesToBackmatter(body, back, createElement)
  createAccessibilityItems(doc, createElement)
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

export const parseJATSArticle = (
  doc: Document,
  sectionCategories: SectionCategory[],
  template?: string
) => {
  const journal = parseJournal(doc)
  processJATS(doc, sectionCategories)
  const node = new JATSDOMParser(sectionCategories, schema).parse(doc)
    .firstChild as ActualManuscriptNode
  if (!node) {
    throw new Error('No content was parsed from the JATS article body')
  }
  updateDocumentIDs(node)
  if (template) {
    node.attrs.prototype = template
  }
  return {
    node,
    journal,
  }
}
