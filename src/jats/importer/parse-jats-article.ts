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
  CommentAnnotation,
  ElementsOrder,
  Journal,
  Manuscript,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'
import { DOMParser } from 'prosemirror-model'

import { InvalidInput } from '../../errors'
import { nodeFromHTML } from '../../lib/html'
import { ManuscriptNode, ManuscriptNodeType, schema } from '../../schema'
import { auxiliaryObjectTypes, nodeTypesMap } from '../../transformer'
import {
  AuxiliaryObjects,
  Build,
  buildElementsOrder,
  buildJournal,
  buildManuscript,
  DEFAULT_BUNDLE,
} from '../../transformer/builders'
import { encode, inlineContents } from '../../transformer/encode'
import { FootnotesOrderBuilder } from '../../transformer/footnotes-order-builder'
import { generateID } from '../../transformer/id'
import { findManuscript } from '../../transformer/project-bundle'
import { jatsBodyDOMParser } from './jats-body-dom-parser'
import { jatsBodyTransformations } from './jats-body-transformations'
import {
  createOrUpdateComments,
  markProcessingInstructions,
} from './jats-comments'
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

  // footnotes
  const { footnotes, footnoteIDs } = jatsFrontParser.parseFootnoteNodes([
    ...front.querySelectorAll('article-meta > author-notes > fn'),
  ])

  // correspondings
  const {
    correspondingList,
    correspondingIDs,
  } = jatsFrontParser.parseCorrespNodes([
    ...front.querySelectorAll('article-meta > author-notes > corresp'),
  ])

  // contributors
  // TODO: handle missing contrib-type?
  const authors = jatsFrontParser.parseAuthorNodes(
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

  const supplements = jatsFrontParser.parseSupplements([
    ...front.querySelectorAll('article-meta > supplementary-material'),
  ])

  const manuscript = {
    ...buildManuscript(),
    ...manuscriptMeta,
    bundle: manuscript_bundle,
    keywordIDs: manuscript_keywordIDs,
    ...history,
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
      ...footnotes,
      ...correspondingList,
      journal,
      ...supplements,
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
  const commentAnnotations: Array<Build<CommentAnnotation>> = []
  if (back) {
    const {
      references,
      referenceIDs,
      comments,
    } = jatsReferenceParser.parseReferences(
      [...back.querySelectorAll('ref-list > ref')],
      createElement
    )
    bibliographyItems.push(...references)
    commentAnnotations.push(...comments)
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
    comments: generateModelIDs(commentAnnotations),
  }
}

export const parseJATSBody = (
  document: Document,
  body: Element,
  bibliography: Element | null,
  refModels: Model[],
  footnotesOrderBuilder: FootnotesOrderBuilder | null
): ManuscriptNode => {
  const createElement = createElementFn(document)
  jatsBodyTransformations.moveFloatsGroupToBody(document, body, createElement)
  jatsBodyTransformations.ensureSection(body, createElement)
  jatsBodyTransformations.mapFootnotesToSections(
    document,
    body,
    footnotesOrderBuilder,
    createElement
  )
  jatsBodyTransformations.moveSectionsToBody(
    document,
    body,
    bibliography,
    createElement
  )
  jatsBodyTransformations.wrapFigures(body, createElement)
  jatsBodyTransformations.moveCaptionsToEnd(body)
  jatsBodyTransformations.moveTableFooterToEnd(body)
  jatsBodyTransformations.moveBlockNodesFromParagraph(
    document,
    body,
    createElement
  )
  //jatsBodyTransformations.unwrapParagraphsInCaptions(body)
  const node = jatsBodyDOMParser.parse(body)
  if (!node.firstChild) {
    throw new Error('No content was parsed from the JATS article body')
  }

  const { replacements } = fixBodyPMNode(node.firstChild, refModels)
  if (footnotesOrderBuilder) {
    footnotesOrderBuilder.build(replacements)
  }
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
  tables.forEach((table) => {
    // Move cols into a colgroup if they are not already
    // This more closely maps how they exist in HTML and, subsequently, in ManuscriptJSON
    const colgroup = table.querySelector('colgroup')
    const cols = table.querySelectorAll('col')
    if (!colgroup && table.firstChild && cols.length > 0) {
      const colgroup = createElement('colgroup')
      for (const col of cols) {
        colgroup.appendChild(col)
      }
      table.insertBefore(colgroup, table.firstChild)
    }

    // Ensures that tables have a header and footer row
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
  const articleElement = doc.querySelector('article')
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  const back = doc.querySelector('back')
  if (!front) {
    throw new InvalidInput('Invalid JATS format! Missing front element')
  }

  if (!articleElement) {
    throw new InvalidInput('Invalid JATS format! Missing article element')
  }

  const authorQueriesMap = markProcessingInstructions(doc)

  const createElement = createElementFn(document)
  const { models: frontModels, bundles } = await parseJATSFront(front)
  const { references, crossReferences, comments } = parseJATSReferences(
    back,
    body,
    createElement
  )

  transformTables(doc.querySelectorAll('table-wrap > table'), createElement)
  const bibliography = await createBibliography(
    references as BibliographyItem[],
    bundles
  )

  const footnotesOrderBuilder = new FootnotesOrderBuilder()
  let elementsOrder: ElementsOrder[] = []
  const bodyModels: Array<Model> = []
  if (body) {
    const bodyDoc = parseJATSBody(
      doc,
      body,
      bibliography,
      crossReferences,
      footnotesOrderBuilder
    )
    bodyModels.push(...encode(bodyDoc).values())
    elementsOrder = getElementsOrder(bodyDoc)
  }
  // TODO: use ISSN from journal-meta to choose a template

  const frontModelsMap = new Map(frontModels.map((model) => [model._id, model]))

  const manuscript = findManuscript(frontModelsMap)
  const footnotesOrder: Partial<Model> = footnotesOrderBuilder.order

  if (manuscript) {
    const articleType = articleElement.getAttribute('article-type')
    manuscript.articleType = articleType || 'other'
  }

  const models = [
    ...frontModels,
    ...bodyModels,
    ...references,
    ...crossReferences,
    ...comments,
    ...elementsOrder,
  ]

  if (footnotesOrder) {
    models.push(footnotesOrder as Model)
  }

  createOrUpdateComments(authorQueriesMap, models)

  return models
}

const getElementsOrder = (node: ManuscriptNode) => {
  const elementsOrderIndex = new Map<ManuscriptNodeType, number>()
  const models: ElementsOrder[] = []

  node.descendants((child) => {
    if (auxiliaryObjectTypes.has(child.type)) {
      const type =
        child.type === schema.nodes.multi_graphic_figure_element
          ? schema.nodes.figure_element
          : child.type
      const index = elementsOrderIndex.get(type)
      if (index !== undefined) {
        const elementsOrder = models[index]
        elementsOrder.elements.push(child.attrs['id'])
      } else {
        const elementsOrder = buildElementsOrder(
          nodeTypesMap.get(type) as AuxiliaryObjects
        ) as ElementsOrder

        elementsOrder.elements.push(child.attrs['id'])
        models.push(elementsOrder)
        elementsOrderIndex.set(type, elementsOrderIndex.size)
      }
    }
  })

  return models
}
