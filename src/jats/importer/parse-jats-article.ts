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

import { ManuscriptNode } from '../../schema'
import { jatsBodyTransformations } from './jats-body-transformations'
import { markComments } from './jats-comments'
import { jatsDOMParser } from './jats-dom-parser'
import { jatsFrontTransformations } from './jats-front-transformations'
import { parseJournal } from './jats-journal-meta-parser'
import { updateDocumentIDs } from './jats-parser-utils'

const parseJATSBody = (doc: Document) => {
  const createElement = createElementFn(doc)
  const body = doc.querySelector('body')
  if (!body) {
    return
  }

  jatsBodyTransformations.ensureSection(body, createElement)
  jatsBodyTransformations.moveCaptionsToEnd(body)
  jatsBodyTransformations.fixTables(body, createElement)
  jatsBodyTransformations.createBody(doc, body, createElement)
  jatsBodyTransformations.createAbstracts(doc, body, createElement)
  jatsBodyTransformations.createBackmatter(doc, body, createElement)
  jatsBodyTransformations.createSuppleMaterials(doc, body, createElement)
  jatsBodyTransformations.createKeywords(doc, body, createElement)
  jatsBodyTransformations.orderTableFootnote(doc, body)

  const back = doc.querySelector('back')
  if (!back) {
    return
  }

  jatsBodyTransformations.moveReferencesToBackmatter(body, back, createElement)
}
const parseJATSFront = (doc: Document, template?: string) => {
  const createElement = createElementFn(doc)
  const front = doc.querySelector('front')
  if (!front) {
    return
  }

  jatsFrontTransformations.setArticleAttrs(doc, template)

  const authorNotes = jatsFrontTransformations.createAuthorNotes(
    doc,
    createElement
  )
  if (authorNotes) {
    doc.documentElement.prepend(authorNotes)
  }
  const affiliations = jatsFrontTransformations.createAffiliations(
    front,
    createElement
  )
  if (affiliations) {
    doc.documentElement.prepend(affiliations)
  }
  const contributors = jatsFrontTransformations.createContributors(
    front,
    createElement
  )
  if (contributors) {
    doc.documentElement.prepend(contributors)
  }
  const title = jatsFrontTransformations.createTitle(front, createElement)
  if (title) {
    doc.documentElement.prepend(title)
  }
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

export const parseJATSArticle = (doc: Document, template?: string) => {
  markComments(doc)
  const journal = parseJournal(doc)
  parseJATSFront(doc, template)
  parseJATSBody(doc)
  const node = jatsDOMParser.parse(doc).firstChild
  if (!node) {
    throw new Error('No content was parsed from the JATS article body')
  }
  updateDocumentIDs(node)
  return {
    node: node as ManuscriptNode,
    journal,
  }
}
