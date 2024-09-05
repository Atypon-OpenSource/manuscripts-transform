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

import { Manuscript } from '@manuscripts/json-schema'

import { InvalidInput } from '../../errors'
import { ManuscriptNode } from '../../schema'
import { buildManuscript } from '../../transformer/builders'
import { jatsBodyTransformations } from './jats-body-transformations'
import { markComments } from './jats-comments'
import { jatsBodyDOMParser } from './jats-dom-parser'
import { jatsFrontParser } from './jats-front-parser'
import { jatsFrontTransformations } from './jats-front-transformations'
import { updateDocumentIDs } from './jats-parser-utils'
import { jatsReferenceParser } from './jats-reference-parser'
import { References } from './jats-references'

export const parseJatsBody = (
  doc: Document,
  body: Element,
  references: References | undefined
) => {
  const createElement = createElementFn(doc)
  jatsBodyTransformations.ensureSection(body, createElement)
  jatsBodyTransformations.moveCaptionsToEnd(body)
  jatsBodyTransformations.fixTables(body, createElement)
  jatsBodyTransformations.createBody(doc, body, createElement)
  jatsBodyTransformations.createAbstracts(doc, body, createElement)
  jatsBodyTransformations.createBackmatter(doc, body, createElement)
  jatsBodyTransformations.createSuppleMaterials(doc, body, createElement)
  jatsBodyTransformations.createKeywords(doc, body, createElement)
  jatsBodyTransformations.orderTableFootnote(doc, body)
  jatsBodyTransformations.moveReferencesToBackmatter(
    body,
    references,
    createElement
  )

  return body
}

export const parseJatsFront = (doc: Document) => {
  const front = document.createElement('front')
  jatsFrontTransformations.createTitle(doc, front)
  jatsFrontTransformations.createAffiliations(doc, front)
  jatsFrontTransformations.createAuthorNotes(doc, front)
  jatsFrontTransformations.createContributors(doc, front)
  return front
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

const appendChildren = (parent: Element, source: Element | null) => {
  while (source?.firstChild) {
    parent.appendChild(source.firstChild)
  }
}
export const parseJATSArticle = (doc: Document, template?: string) => {
  const article = doc.querySelector('article')
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  const back = doc.querySelector('back')

  if (!article || !front) {
    throw new InvalidInput('invalid JATS format')
  }

  markComments(doc)

  const journal = createJournal(front)
  const manuscript = createManuscript(front, template)

  const createElement = createElementFn(doc)
  let references
  if (back) {
    references = jatsReferenceParser.parseReferences(
      [...back.querySelectorAll('ref-list > ref')],
      createElement
    )
  }
  const replacements = new Map<string, string>(references?.IDs)

  if (body) {
    parseJatsBody(doc, body, references)
  }
  const parsedFront = parseJatsFront(doc)

  const newArticle = createElement('article')

  appendChildren(newArticle, parsedFront)
  appendChildren(newArticle, body)

  const comments = doc.querySelector('comments-annotations')
  if (comments) {
    newArticle.appendChild(comments)
  }

  const node = jatsBodyDOMParser.parse(newArticle).firstChild
  if (!node) {
    throw new Error('No content was parsed from the JATS article body')
  }
  updateDocumentIDs(node, replacements)
  return {
    node: node as ManuscriptNode,
    manuscript: manuscript as Manuscript,
    journal,
  }
}

const createManuscript = (front: Element, template?: string) => {
  const DOI = jatsFrontParser.parseDOI(front)
  const counts = jatsFrontParser.parseCounts(
    front.querySelector('article-meta counts')
  )
  const history = jatsFrontParser.parseDates(
    front.querySelector('article-meta > history')
  )

  const manuscript = {
    ...buildManuscript(),
    ...counts,
    ...history,
    DOI,
    template,
  } as any

  return manuscript
}

const createJournal = (front: Element) => {
  return jatsFrontParser.parseJournal(front.querySelector('journal-meta'))
}
