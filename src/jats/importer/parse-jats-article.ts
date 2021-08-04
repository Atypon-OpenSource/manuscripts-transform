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
  CitationProvider,
  createBibliographyElementContents,
  loadCitationStyle,
} from '@manuscripts/library'
import {
  AuxiliaryObjectReference,
  BibliographyItem,
  Bundle,
  Citation,
  Journal,
  Manuscript,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'
import { DOMParser } from 'prosemirror-model'

import { InvalidInput } from '../../errors'
import { nodeFromHTML } from '../../lib/html'
import { ManuscriptNode, schema } from '../../schema'
import {
  Build,
  buildJournal,
  buildManuscript,
  DEFAULT_BUNDLE,
} from '../../transformer/builders'
import { encode, inlineContents } from '../../transformer/encode'
import { generateID } from '../../transformer/id'
import { jatsBodyDOMParser } from './jats-body-dom-parser'
import { jatsBodyTransformations } from './jats-body-transformations'
import { jatsFrontParser } from './jats-front-parser'
import { ISSN } from './jats-journal-meta-parser'
import { fixBodyPMNode } from './jats-parser-utils'
import { jatsReferenceParser } from './jats-reference-parser'

const parser = DOMParser.fromSchema(schema)
const inlineContentsFromJATSTitle = (htmlTitle: string): string => {
  const node = nodeFromHTML(`<h1>${htmlTitle}</h1>`)
  if (node) {
    const titleNode = parser.parse(node, {
      topNode: schema.nodes.section_title.create(),
    })
    return inlineContents(titleNode)
  }
  throw new InvalidInput('Invalid title content for: ' + htmlTitle)
}

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
  const title = articleMeta?.querySelector('title-group > article-title')
    ?.innerHTML
  const subtitle = articleMeta?.querySelector('title-group > subtitle')
    ?.innerHTML
  const runningTitle = articleMeta?.querySelector(
    'title-group > alt-title[alt-title-type="right-running"]'
  )?.innerHTML
  const manuscriptMeta = {
    title: title ? inlineContentsFromJATSTitle(title) : undefined,
    subtitle: subtitle ? inlineContentsFromJATSTitle(subtitle) : undefined,
    runningTitle: runningTitle
      ? inlineContentsFromJATSTitle(runningTitle)
      : undefined,
    ...jatsFrontParser.parseCounts(articleMeta?.querySelector('counts')),
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

  return {
    models: generateModelIDs([
      manuscript,
      ...bundleNodes,
      ...keywords,
      ...affiliations,
      ...authors,
      ...keywordGroups,
      journal,
    ]),
    bundles: bundleNodes,
  }
}

export const parseJATSReferences = (
  back: Element | null,
  body: Element | null,
  createElement: (tagName: string) => HTMLElement
) => {
  // TODO: appendices (app-group/app)
  // TODO: notes (notes)
  const bibliographyItems: Array<Build<BibliographyItem>> = []
  const crossReferences: Array<
    Build<Citation> | Build<AuxiliaryObjectReference>
  > = []
  if (back) {
    const { references, referenceIDs } = jatsReferenceParser.parseReferences(
      [...back.querySelectorAll('ref-list > ref')],
      createElement
    )
    bibliographyItems.push(...references)

    if (body) {
      crossReferences.push(
        ...jatsReferenceParser.parseCrossReferences(
          [...body.querySelectorAll('xref')],
          referenceIDs
        )
      )
    }
  }
  return {
    references: generateModelIDs(bibliographyItems),
    crossReferences: generateModelIDs(crossReferences),
  }
}

export const parseJATSBody = (
  document: Document,
  body: Element,
  bibliography: Element | null,
  refModels: Model[]
): ManuscriptNode => {
  const createElement = createElementFn(document)
  jatsBodyTransformations.moveFloatsGroupToBody(document, body, createElement)
  jatsBodyTransformations.ensureSection(body, createElement)
  jatsBodyTransformations.mapFootnotesToSections(document, body, createElement)
  jatsBodyTransformations.moveSectionsToBody(
    document,
    body,
    bibliography,
    createElement
  )
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

const createBibliography = async (
  citations: BibliographyItem[],
  bundles: Bundle[]
) => {
  const styleOpts = { bundle: bundles[0], bundleID: DEFAULT_BUNDLE }
  const citationStyle = await loadCitationStyle(styleOpts)
  const [
    bibmeta,
    bibliographyItems,
  ] = CitationProvider.makeBibliographyFromCitations(citations, citationStyle)

  if (bibmeta.bibliography_errors.length) {
    console.error(bibmeta.bibliography_errors)
  }
  return createBibliographyElementContents(bibliographyItems)
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
  if (!front) {
    throw new InvalidInput('Invalid JATS format! Missing front element')
  }
  const createElement = createElementFn(document)
  const { models: frontModels, bundles } = await parseJATSFront(front)
  const { references, crossReferences } = parseJATSReferences(
    back,
    body,
    createElement
  )

  transformTables(doc.querySelectorAll('table-wrap > table'), createElement)
  const bibliography = await createBibliography(
    references as BibliographyItem[],
    bundles
  )
  const bodyModels: Array<Model> = []
  if (body) {
    const bodyDoc = parseJATSBody(doc, body, bibliography, crossReferences)
    bodyModels.push(...encode(bodyDoc).values())
  }
  // TODO: use ISSN from journal-meta to choose a template
  return [...frontModels, ...bodyModels, ...references, ...crossReferences]
}
