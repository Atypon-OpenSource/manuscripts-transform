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
  BibliographyElement,
  Model,
  ObjectTypes,
  Section,
} from '@manuscripts/json-schema'

import { InvalidInput } from '../../errors'
import {
  buildBibliographyElement,
  buildSection,
  encode,
} from '../../transformer'
import { Build, buildManuscript } from '../../transformer/builders'
import { generateID } from '../../transformer/id'
import { findManuscript } from '../../transformer/project-bundle'
import { jatsBodyDOMParser } from './jats-body-dom-parser'
import { jatsBodyTransformations } from './jats-body-transformations'
import {
  createComments,
  createReferenceComments,
  markComments,
} from './jats-comments'
import { jatsFrontParser } from './jats-front-parser'
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

  // footnotes
  const { footnotes, footnoteIDs } = jatsFrontParser.parseAuthorNotes([
    ...front.querySelectorAll(
      'article-meta > author-notes > fn:not([fn-type])'
    ),
  ])

  const { correspondingList, correspondingIDs } = jatsFrontParser.parseCorresp([
    ...front.querySelectorAll('article-meta > author-notes > corresp'),
  ])

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

const createBibliographyModels = (references: References) => {
  const models = []
  const bibliographyItems = references.getBibliographyItems()
  const bibliographyElement = buildBibliographyElement(
    bibliographyItems
  ) as BibliographyElement
  const bibliographySection = {
    ...buildSection(99),
    category: 'MPSectionCategory:bibliography',
    elementIDs: [bibliographyElement._id],
    title: 'References',
  } as Section
  const comments = createReferenceComments(references)
  models.push(bibliographySection)
  models.push(bibliographyElement)
  models.push(...bibliographyItems)
  models.push(...comments)
  return models
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

const generateIDs = (models: Build<Model>[]) =>
  models.map((m) =>
    m._id ? m : { ...m, _id: generateID(m.objectType as ObjectTypes) }
  ) as Model[]

export const parseJATSArticle = (doc: Document): Model[] => {
  const article = doc.querySelector('article')
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  const back = doc.querySelector('back')
  if (!front) {
    throw new InvalidInput('Invalid JATS format! Missing front element')
  }

  if (!article) {
    throw new InvalidInput('Invalid JATS format! Missing article element')
  }

  const marks = markComments(doc)

  const createElement = createElementFn(doc)

  const models: Model[] = []

  let references
  if (back) {
    references = jatsReferenceParser.parseReferences(
      [...back.querySelectorAll('ref-list > ref')],
      createElement
    )
  }

  models.push(...parseJATSFront(doc, front))

  if (body) {
    models.push(...parseJATSBody(doc, body, references))
  }

  const modelMap = new Map(models.map((model) => [model._id, model]))
  const manuscript = findManuscript(modelMap)
  if (manuscript) {
    const type = article.getAttribute('article-type')
    manuscript.articleType = type || 'other'
  }

  if (references && references.items.size) {
    models.push(...createBibliographyModels(references))
  }

  if (marks.length) {
    const comments = createComments(models, marks)
    models.push(...comments)
  }

  return models
}
