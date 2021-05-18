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
  Journal,
  Manuscript,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import { ManuscriptNode } from '../../schema'
import {
  Build,
  buildJournal,
  buildManuscript,
} from '../../transformer/builders'
import { encode } from '../../transformer/encode'
import { generateID } from '../../transformer/id'
import { jatsBodyDOMParser } from './jats-body-dom-parser'
import { jatsBodyTransformations } from './jats-body-transformations'
import { jatsFrontParser } from './jats-front-parser'
import { ISSN } from './jats-journal-meta-parser'
import { fixBodyPMNode } from './jats-parser-utils'
import { jatsReferenceParser } from './jats-reference-parser'

export const parseJATSFront = async (front: Element) => {
  const journalMeta = jatsFrontParser.parseJournal(
    front.querySelector('journal-meta')
  )

  const journal = {
    ...buildJournal(),
    ...journalMeta,
  } as Journal

  // manuscript bundle (CSL style)
  const {
    manuscript_bundle,
    bundleNodes,
  } = await jatsFrontParser.loadJournalBundles(journal.ISSNs as ISSN[])

  const articleMeta = front.querySelector('article-meta')
  const manuscriptMeta = {
    title: articleMeta?.querySelector('title-group > article-title')
      ?.textContent,
    subtitle: articleMeta?.querySelector('title-group > subtitle')?.textContent,
    runningTitle: articleMeta?.querySelector(
      'title-group > alt-title[alt-title-type="right-running"]'
    )?.textContent,
  }

  const keywordGroupNodes = articleMeta?.querySelectorAll('kwd-group')
  const { keywords, groups: keywordGroups } = jatsFrontParser.parseKeywords(
    keywordGroupNodes
  )

  const manuscript_keywordIDs =
    keywords.length > 0 ? keywords.map((k) => k._id) : undefined

  // affiliations
  const {
    affiliations,
    affiliationIDs,
  } = jatsFrontParser.parseAffiliationNodes([
    ...front.querySelectorAll('article-meta > contrib-group > aff'),
  ])

  // contributors
  // TODO: handle missing contrib-type?
  const authors = jatsFrontParser.parseAuthorNodes(
    [
      ...front.querySelectorAll(
        'article-meta > contrib-group > contrib[contrib-type="author"]'
      ),
    ],
    affiliationIDs
  )

  const manuscript = {
    ...buildManuscript(),
    ...manuscriptMeta,
    bundle: manuscript_bundle,
    keywordIDs: manuscript_keywordIDs,
  } as Build<Manuscript> & {
    keywordIDs?: string[]
  }

  return generateModelIDs([
    manuscript,
    ...bundleNodes,
    ...keywords,
    ...affiliations,
    ...authors,
    ...keywordGroups,
    journal,
  ])
}

export const parseJATSReferences = (
  back: Element,
  body: Element,
  createElement: (tagName: string) => HTMLElement
) => {
  // TODO: appendices (app-group/app)
  // TODO: notes (notes)
  const { references, referenceIDs } = jatsReferenceParser.parseReferences(
    [...back.querySelectorAll('ref-list > ref')],
    createElement
  )

  const crossReferences = jatsReferenceParser.parseCrossReferences(
    [...body.querySelectorAll('xref')],
    referenceIDs
  )

  return generateModelIDs([...references, ...crossReferences])
}

export const parseJATSBody = (
  document: Document,
  body: Element,
  refModels: Model[]
): ManuscriptNode => {
  const createElement = createElementFn(document)
  jatsBodyTransformations.ensureSection(body, createElement)
  jatsBodyTransformations.moveSectionsToBody(document, body, createElement)
  jatsBodyTransformations.wrapFigures(body, createElement)
  jatsBodyTransformations.moveCaptionsToEnd(body)
  jatsBodyTransformations.unwrapParagraphsInCaptions(body)
  const node = jatsBodyDOMParser.parse(body)
  if (!node.firstChild) {
    throw new Error('No content was parsed from the JATS article body')
  }
  fixBodyPMNode(node.firstChild, refModels)
  // if (warnings.length > 0) {
  //   console.warn(`Parsed JATS body with ${warnings.length} warnings.`)
  //   console.debug(warnings)
  // }
  return node.firstChild
}

const transformTables = (
  tables: NodeListOf<Element>,
  createElement: (tagName: string) => HTMLElement
) => {
  // ensure that tables have a header and footer row
  tables.forEach((table) => {
    const tbody = table.querySelector('tbody')

    if (tbody) {
      // if there are no table header rows, add an extra row to the start of the table body
      const headerRow = table.querySelector('thead > tr')

      if (!headerRow) {
        const tr = createElement('tr')
        tbody.insertBefore(tr, tbody.firstElementChild)
      }

      // if there are no table footer rows, add an extra row to the end of the table body
      const footerRow = table.querySelector('tfoot > tr')

      if (!footerRow) {
        const tr = createElement('tr')
        tbody.appendChild(tr)
      }
    }
  })
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

const generateModelIDs = (models: Build<Model>[]) =>
  models.map((m) =>
    m._id ? m : { ...m, _id: generateID(m.objectType as ObjectTypes) }
  ) as Model[]

export const parseJATSArticle = async (doc: Document): Promise<Model[]> => {
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  const back = doc.querySelector('back')
  if (!front || !body || !back) {
    throw Error('Invalid JATS format! Missing front, body or back element')
  }
  const createElement = createElementFn(document)
  const frontModels = await parseJATSFront(front)
  const refModels = parseJATSReferences(back, body, createElement)

  transformTables(doc.querySelectorAll('table-wrap > table'), createElement)

  const bodyDoc = parseJATSBody(doc, body, refModels)
  const bodyModels = [...encode(bodyDoc).values()]
  // TODO: use ISSN from journal-meta to choose a template
  return [...frontModels, ...bodyModels, ...refModels]
}
