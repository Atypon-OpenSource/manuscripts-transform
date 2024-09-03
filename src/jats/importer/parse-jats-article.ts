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

import { Manuscript, Model, ObjectTypes } from '@manuscripts/json-schema'

import { InvalidInput } from '../../errors'
import { ManuscriptNode } from '../../schema'
import { encode } from '../../transformer'
import { Build, buildManuscript } from '../../transformer/builders'
import { generateID } from '../../transformer/id'
import { jatsBodyDOMParser } from './jats-body-dom-parser'
import { jatsBodyTransformations } from './jats-body-transformations'
import { markNodeComments } from './jats-comments'
import { jatsFrontParser } from './jats-front-parser'
import { jatsFrontTransformations } from './jats-front-transformations'
import { updateDocumentIDs } from './jats-parser-utils'
import { jatsReferenceParser } from './jats-reference-parser'
import { References } from './jats-references'

export const parseJATSFront = (doc: Document, front: Element) => {
  const createElement = createElementFn(doc)

  const journal = jatsFrontParser.parseJournal(
    front.querySelector('journal-meta')
  )

  const titles = jatsFrontParser.parseTitles(
    front.querySelector('article-meta > title-group'),
    createElement
  )

  const DOI = jatsFrontParser.parseDOI(front)
  // affiliations
  const { affiliations, affiliationIDs } = jatsFrontParser.parseAffiliations([
    ...front.querySelectorAll('article-meta > contrib-group > aff'),
  ])

  // author-footnotes
  const {
    footnotes,
    footnoteIDs,
    authorNotes,
    authorNotesParagraphs,
    correspondingIDs,
    correspondingList,
  } = jatsFrontParser.parseAuthorNotes(
    front.querySelector('article-meta > author-notes')
  )

  // contributors
  const authors = jatsFrontParser.parseContributors(
    [
      ...front.querySelectorAll(
        'article-meta > contrib-group > contrib[contrib-type="author"]'
      ),
    ],
    affiliationIDs,
    footnoteIDs,
    correspondingIDs
  )

  const history = jatsFrontParser.parseDates(
    front.querySelector('article-meta > history')
  )

  const counts = jatsFrontParser.parseCounts(
    front.querySelector('article-meta counts')
  )

  const manuscript = {
    ...buildManuscript(),
    ...counts,
    ...history,
    DOI,
  }
  return generateIDs([
    manuscript,
    titles,
    journal,
    ...authorNotesParagraphs,
    ...authorNotes,
    ...footnotes,
    ...authors,
    ...affiliations,
    ...correspondingList,
  ])
}

export const parseJATSBody = (
  doc: Document,
  body: Element,
  references?: References
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

  const node = jatsBodyDOMParser.parse(body).firstChild
  if (!node) {
    throw new Error('No content was parsed from the JATS article body')
  }
  const replacements = new Map<string, string>(references?.IDs)
  updateDocumentIDs(node, replacements)

  return encode(node).values()
}

export const parseEntireArticle = (
  doc: Document,
  body: Element,
  references?: References
) => {
  const replacements = new Map<string, string>(references?.IDs)

  const createElement = createElementFn(doc)
  const newBody = parseJATSBodyTest(doc, body)
  const front = parseJatsFrontTest(doc)
  const comments = doc.querySelector('comments-annotations')

  const article = createElement('article')
  addReferencesToBackMatterSection(doc, newBody, references)

  while (front.firstChild) {
    article.appendChild(front.firstChild)
  }
  while (newBody.firstChild) {
    article.appendChild(newBody.firstChild)
  }

  if (comments) {
    article.appendChild(comments)
  }

  const node = jatsBodyDOMParser.parse(article).firstChild
  if (!node) {
    throw new Error('No content was parsed from the JATS article body')
  }
  updateDocumentIDs(node, replacements)

  return node
}

const addReferencesToBackMatterSection = (
  document: Document,
  body: Element,
  references: References | undefined
) => {
  if (references && references.items.size) {
    const backmatter = body.querySelector('sec[sec-type="backmatter"]')
    if (!backmatter) {
      return
    }
    const bibliographySection = document.createElement('sec')
    bibliographySection.setAttribute('sec-type', 'bibliography')

    bibliographySection.appendChild(
      document.createElement('bibliography-title')
    )
    const bibliographyElement = document.createElement('bibliography-element')
    bibliographyElement.setAttribute(
      'id',
      generateID(ObjectTypes.BibliographyElement)
    )

    references.getBibliographyItems().forEach((item) => {
      const bibliographyItem = document.createElement('bibliography-item')
      bibliographyItem.setAttribute('id', item._id)
      bibliographyItem.setAttribute('type', item.type)
      //todo get back to the author and issued
      bibliographyItem.setAttribute(
        'containerTitle',
        item['container-title'] || ''
      )
      bibliographyItem.setAttribute('volume', item.volume?.toString() || '')
      bibliographyItem.setAttribute('issue', item.issue?.toString() || '')
      bibliographyItem.setAttribute('supplement', item.supplement || '')
      bibliographyItem.setAttribute('page', item.page?.toString() || '')
      bibliographyItem.setAttribute('title', item.title || '')
      bibliographyItem.setAttribute('literal', item.literal || '')
      bibliographyElement.appendChild(bibliographyItem)
    })

    bibliographySection.appendChild(bibliographyElement)
    backmatter.appendChild(bibliographySection)
  }
}
export const parseJATSBodyTest = (doc: Document, body: Element) => {
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

  return body
}

export const parseJatsFrontTest = (doc: Document) => {
  const front = document.createElement('front')
  jatsFrontTransformations.createTitle(doc, front)
  jatsFrontTransformations.createAffiliations(doc, front)
  jatsFrontTransformations.createAuthorNotes(doc, front)
  jatsFrontTransformations.createContributors(doc, front)
  return front
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

const generateIDs = (models: Build<Model>[]) =>
  models.map((m) =>
    m._id ? m : { ...m, _id: generateID(m.objectType as ObjectTypes) }
  ) as Model[]

export const createArticleNode = (doc?: Document, template?: string) => {
  return doc ? parseJATSArticle(doc, template) : createManuscriptNode()
}

export const createManuscriptNode = () => {
  const article = document.createElement('article')
  const title = document.createElement('article-title')
  article.appendChild(title)

  return jatsBodyDOMParser.parse(article).firstChild as ManuscriptNode
}

export const parseJATSArticle = (doc: Document, template?: string) => {
  const article = doc.querySelector('article')
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  const back = doc.querySelector('back')

  if (!article || !front || !body || !back) {
    throw new InvalidInput('invalid JATS format')
  }

  markNodeComments(doc)

  const journal = createJournal(front)
  const manuscript = createManuscript(front)

  if (template) {
    manuscript.template = template
  }

  const createElement = createElementFn(doc)
  let references
  if (back) {
    references = jatsReferenceParser.parseReferences(
      [...back.querySelectorAll('ref-list > ref')],
      createElement
    )
  }
  const replacements = new Map<string, string>(references?.IDs)

  const parsedBody = parseJATSBodyTest(doc, body)
  const parsedFront = parseJatsFrontTest(doc)
  const comments = doc.querySelector('comments-annotations')

  const newArticle = createElement('article')
  addReferencesToBackMatterSection(doc, parsedBody, references)

  while (parsedFront.firstChild) {
    newArticle.appendChild(parsedFront.firstChild)
  }
  while (parsedBody.firstChild) {
    newArticle.appendChild(parsedBody.firstChild)
  }

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

const createManuscript = (front: Element) => {
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
  } as any

  return manuscript
}

const createJournal = (front: Element) => {
  return jatsFrontParser.parseJournal(front.querySelector('journal-meta'))
}
