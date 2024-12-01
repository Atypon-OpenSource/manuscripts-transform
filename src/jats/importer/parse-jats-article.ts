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

import { ActualManuscriptNode } from '../../schema'
import { markComments } from './jats-comments'
import { jatsDOMParser } from './jats-dom-parser'
import { parseJournal } from './jats-journal-meta-parser'
import { updateDocumentIDs } from './jats-parser-utils'
import {
  createAbstracts,
  createBackmatter,
  createBody,
  createBoxedElementSection,
  createKeywordsSection,
  createSupplementaryMaterialsSection,
  fixTables,
  moveAffiliations,
  moveAuthorNotes,
  moveAwards,
  moveCaptionsToEnd,
  moveContributors,
  moveReferencesToBackmatter,
  moveTitle,
  orderTableFootnote,
} from './jats-transformations'

const processJATS = (doc: Document) => {
  const createElement = createElementFn(doc)

  markComments(doc)

  const front = doc.querySelector('front')
  if (!front) {
    return
  }

  moveTitle(front, createElement)
  moveContributors(front, createElement)
  moveAffiliations(front, createElement)
  moveAuthorNotes(front, createElement)
  moveAwards(front)

  const body = doc.querySelector('body')
  if (!body) {
    return
  }

  moveCaptionsToEnd(body)
  createBoxedElementSection(body, createElement)
  createBody(doc, body, createElement)
  createAbstracts(doc, body, createElement)
  createBackmatter(doc, body, createElement)
  createSupplementaryMaterialsSection(doc, body, createElement)
  createKeywordsSection(doc, body, createElement)
  fixTables(doc, body, createElement)
  orderTableFootnote(doc, body)

  const back = doc.querySelector('back')
  if (!back) {
    return
  }

  moveReferencesToBackmatter(body, back, createElement)
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

export const parseJATSArticle = (doc: Document, template?: string) => {
  const journal = parseJournal(doc)
  processJATS(doc)
  const node = jatsDOMParser.parse(doc).firstChild as ActualManuscriptNode
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
