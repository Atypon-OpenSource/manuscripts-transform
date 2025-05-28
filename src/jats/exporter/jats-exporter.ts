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
  type BibliographicDate,
  BibliographicName,
  BibliographyItem,
  Journal,
  ObjectTypes,
} from '@manuscripts/json-schema'
import { CitationProvider } from '@manuscripts/library'
import debug from 'debug'
import {
  type NodeType,
  DOMOutputSpec,
  DOMParser as ProsemirrorDOMParser,
  DOMSerializer,
} from 'prosemirror-model'
import { findChildrenByAttr, findChildrenByType } from 'prosemirror-utils'
import serializeToXML from 'w3c-xmlserializer'

import { CRediTRoleUrls } from '../../lib/credit-roles'
import { generateFootnoteLabels } from '../../lib/footnotes'
import { nodeFromHTML, textFromHTML } from '../../lib/html'
import {
  AuthorNotesNode,
  AwardNode,
  CitationNode,
  ContributorNode,
  CorrespNode,
  CrossReferenceNode,
  FootnoteNode,
  isCitationNode,
  isNodeOfType,
  ManuscriptMark,
  ManuscriptNode,
  ManuscriptNodeType,
  Marks,
  Nodes,
  ParagraphNode,
  QuoteImageNode,
  schema,
  TableElementFooterNode,
  TableElementNode,
} from '../../schema'
import { isExecutableNodeType, isNodeType } from '../../transformer'
import { IDGenerator } from '../types'
import { selectVersionIds, Version } from './jats-versions'
import { buildTargets, Target } from './labels'

interface Attrs {
  [key: string]: string
}

type NodeSpecs = { [key in Nodes]: (node: ManuscriptNode) => DOMOutputSpec }

type MarkSpecs = {
  [key in Marks]: (mark: ManuscriptMark, inline: boolean) => DOMOutputSpec
}

const publicationTypeToJats: Record<string, string> = {
  article: 'journal',
  'article-journal': 'journal',
  webpage: 'web',
  dataset: 'data',
}

const warn = debug('manuscripts-transform')

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const normalizeID = (id: string) => id.replace(/:/g, '_')

const parser = ProsemirrorDOMParser.fromSchema(schema)
// siblings from https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/article-meta.html
const insertAbstractNode = (articleMeta: Element, abstractNode: Element) => {
  const siblings = [
    'kwd-group',
    'funding-group',
    'support-group',
    'conference',
    'counts',
    'custom-meta-group',
  ]

  for (const sibling of siblings) {
    const siblingNode = articleMeta.querySelector(`:scope > ${sibling}`)

    if (siblingNode) {
      articleMeta.insertBefore(abstractNode, siblingNode)
      return
    }
  }

  articleMeta.appendChild(abstractNode)
}

export const createCounter = () => {
  const counts = new Map<string, number>()

  return {
    increment: (field: string) => {
      const value = counts.get(field)
      const newValue = value === undefined ? 1 : value + 1
      counts.set(field, newValue)
      return newValue
    },
  }
}

const createDefaultIdGenerator = (): IDGenerator => {
  const counter = createCounter()

  return async (element: Element) => {
    const value = String(counter.increment(element.nodeName))

    return `${element.localName}-${value}`
  }
}

const chooseRefType = (type: ManuscriptNodeType): string | undefined => {
  switch (type) {
    case schema.nodes.figure:
    case schema.nodes.figure_element:
      return 'fig'

    case schema.nodes.footnote:
      return 'fn'

    case schema.nodes.table:
    case schema.nodes.table_element:
      return 'table'

    case schema.nodes.section:
      return 'sec'

    case schema.nodes.equation:
    case schema.nodes.equation_element:
      return 'disp-formula'
  }
}

const sortContributors = (a: ContributorNode, b: ContributorNode) =>
  Number(a.attrs.priority) - Number(b.attrs.priority)

export type CSLOptions = {
  style: string
  locale: string
}
export type ExportOptions = {
  version?: Version
  journal?: Journal
  csl: CSLOptions
}
export const buildCitations = (citations: CitationNode[]) =>
  citations.map((citation) => ({
    citationID: citation.attrs.id,
    citationItems: citation.attrs.rids.map((rid) => ({
      id: rid,
    })),
    properties: {
      noteIndex: 0,
    },
  }))

export class JATSExporter {
  protected document: Document
  protected serializer: DOMSerializer
  protected labelTargets: Map<string, Target>
  protected footnoteLabels: Map<string, string>
  protected citationTexts: Map<string, string>
  protected citationProvider: CitationProvider
  protected manuscriptNode: ManuscriptNode

  protected generateCitations() {
    const nodes: CitationNode[] = []
    this.manuscriptNode.descendants((node) => {
      if (isCitationNode(node)) {
        nodes.push(node)
      }
    })
    return buildCitations(nodes)
  }

  protected getLibraryItem = (manuscriptID: string) => {
    return (id: string) => {
      const node = findChildrenByAttr(
        this.manuscriptNode,
        (attrs) => attrs.id === id
      )[0]?.node
      if (!node) {
        return undefined
      }
      return {
        ...node.attrs,
        _id: node.attrs.id,
        manuscriptID,
        objectType: ObjectTypes.BibliographyItem,
      } as BibliographyItem
    }
  }

  protected generateCitationTexts(csl: CSLOptions, manuscriptID: string) {
    this.citationTexts = new Map<string, string>()
    this.citationProvider = new CitationProvider({
      getLibraryItem: this.getLibraryItem(manuscriptID),
      locale: csl.locale,
      citationStyle: csl.style,
    })
    const citations = this.generateCitations()
    this.citationProvider.rebuildState(citations).forEach(([id, , output]) => {
      this.citationTexts.set(id, output)
    })
  }

  private nodesMap = new Map<NodeType, ManuscriptNode[]>()

  private populateNodesMap = () => {
    this.manuscriptNode.descendants((node) => {
      const type = node.type
      const nodes = this.nodesMap.get(type) ?? []
      nodes.push(node)
      this.nodesMap.set(type, nodes)
    })
  }

  protected getFirstChildOfType<T extends ManuscriptNode>(
    type: NodeType,
    node?: ManuscriptNode
  ): T | undefined {
    return this.getChildrenOfType<T>(type, node)[0]
  }

  protected getChildrenOfType<T extends ManuscriptNode>(
    type: NodeType,
    node?: ManuscriptNode
  ): T[] {
    const nodes = node
      ? findChildrenByType(node, type).map(({ node }) => node)
      : this.nodesMap.get(type)
    return (nodes ?? []).filter((n): n is T => isNodeOfType<T>(n, type))
  }

  public serializeToJATS = async (
    manuscriptNode: ManuscriptNode,
    options: ExportOptions
  ): Promise<string> => {
    this.manuscriptNode = manuscriptNode
    this.populateNodesMap()
    this.generateCitationTexts(options.csl, manuscriptNode.attrs.id)
    this.createSerializer()
    const versionIds = selectVersionIds(options.version ?? '1.2')

    this.document = document.implementation.createDocument(
      null,
      'article',
      document.implementation.createDocumentType(
        'article',
        versionIds.publicId,
        versionIds.systemId
      )
    )

    const article = this.document.documentElement

    article.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      XLINK_NAMESPACE
    )
    const front = this.buildFront(options.journal)
    article.appendChild(front)
    article.setAttribute(
      'article-type',
      manuscriptNode.attrs.articleType || 'other'
    )
    this.labelTargets = buildTargets(manuscriptNode)
    this.footnoteLabels = generateFootnoteLabels(manuscriptNode)
    const body = this.buildBody()
    article.appendChild(body)
    const back = this.buildBack(body)
    this.moveCoiStatementToAuthorNotes(back, front)
    article.appendChild(back)
    this.unwrapBody(body)
    this.moveAbstracts(front, body)
    this.removeBackContainer(body)
    this.updateFootnoteTypes(front, back)
    this.fillEmptyTableFooters(article)
    this.fillEmptyFootnotes(article)
    this.moveAwards(front, body)
    this.moveFloatsGroup(article)
    await this.rewriteIDs()
    return serializeToXML(this.document)
  }

  private nodeFromJATS = (JATSFragment: string) => {
    JATSFragment = JATSFragment.trim()
    JATSFragment = JATSFragment.replace('&nbsp;', ' ')

    if (!JATSFragment.length) {
      return null
    }

    const template = this.createElement('template')

    template.innerHTML = JATSFragment

    return template.firstChild
  }

  protected rewriteIDs = async (
    generator: IDGenerator = createDefaultIdGenerator()
  ) => {
    const ids = new Map<string, string | null>()

    for (const element of this.document.querySelectorAll('[id]')) {
      const oldID = element.getAttribute('id')
      const newID = await generator(element)

      if (newID) {
        element.setAttribute('id', newID)
      } else {
        element.removeAttribute('id')
      }

      if (oldID) {
        ids.set(oldID, newID)
      }
    }

    for (const node of this.document.querySelectorAll('[rid]')) {
      const rids = node.getAttribute('rid')

      if (rids) {
        const newRids = rids
          .split(/\s+/)
          .filter(Boolean)
          .map((rid) => ids.get(rid))
          .filter(Boolean)

        if (newRids.length) {
          node.setAttribute('rid', newRids.join(' '))
        }
      }
    }
  }

  protected setTitleContent = (element: HTMLElement, title: string) => {
    const htmlTitleNode = nodeFromHTML(`<h1>${title}</h1>`)

    if (htmlTitleNode) {
      // TODO: parse and serialize with title schema
      const titleNode = parser.parse(htmlTitleNode, {
        topNode: schema.nodes.section_title.create(),
      })

      const jatsTitleNode = this.serializeNode(titleNode)

      while (jatsTitleNode.firstChild) {
        element.appendChild(jatsTitleNode.firstChild)
      }
    }
  }

  protected buildFront = (journal?: Journal) => {
    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/front.html
    const front = this.createElement('front')

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/journal-meta.html
    const journalMeta = this.createElement('journal-meta')
    front.appendChild(journalMeta)

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/article-meta.html
    const articleMeta = this.createElement('article-meta')
    front.appendChild(articleMeta)

    if (journal) {
      if (journal.journalIdentifiers) {
        for (const item of journal.journalIdentifiers) {
          const element = this.createElement('journal-id')
          if (item.journalIDType) {
            element.setAttribute('journal-id-type', item.journalIDType)
          }
          element.textContent = item.journalID
          journalMeta.appendChild(element)
        }
      }

      if (journal.title || journal.abbreviatedTitles) {
        const parentElement = this.createElement('journal-title-group')
        journalMeta.appendChild(parentElement)

        if (journal.title) {
          const element = this.createElement('journal-title')
          element.textContent = journal.title
          parentElement.appendChild(element)
        }

        if (journal.abbreviatedTitles) {
          for (const item of journal.abbreviatedTitles) {
            const element = this.createElement('abbrev-journal-title')
            if (item.abbrevType) {
              element.setAttribute('abbrev-type', item.abbrevType)
            }
            element.textContent = item.abbreviatedTitle
            parentElement.appendChild(element)
          }
        }
      }

      if (journal.ISSNs) {
        for (const item of journal.ISSNs) {
          const element = this.createElement('issn')
          if (item.publicationType) {
            element.setAttribute('pub-type', item.publicationType)
          }
          element.textContent = item.ISSN
          journalMeta.appendChild(element)
        }
      }

      if (journal.publisherName) {
        const publisher = this.createElement('publisher')
        const publisherName = this.createElement('publisher-name')
        publisherName.textContent = journal.publisherName
        publisher.appendChild(publisherName)
        journalMeta.appendChild(publisher)
      }
    }
    if (this.manuscriptNode.attrs.doi) {
      const articleID = this.createElement('article-id')
      articleID.setAttribute('pub-id-type', 'doi')
      // @ts-ignore
      articleID.textContent = this.manuscriptNode.attrs.doi
      articleMeta.appendChild(articleID)
    }

    const titleGroup = this.createElement('title-group')

    const titleNode = this.getFirstChildOfType(schema.nodes.title)

    if (titleNode) {
      const element = this.createElement('article-title')
      this.setTitleContent(element, titleNode.textContent)
      titleGroup.appendChild(element)
    }

    const altTitlesNodes = this.getChildrenOfType(schema.nodes.alt_title)

    altTitlesNodes.forEach((titleNode) => {
      const element = this.createElement('alt-title')
      element.setAttribute('alt-title-type', titleNode.attrs.type)
      this.setTitleContent(element, titleNode.textContent)
      titleGroup.appendChild(element)
    })

    articleMeta.appendChild(titleGroup)
    this.buildContributors(articleMeta)

    const supplementsNodes = this.getChildrenOfType(schema.nodes.supplement)
    supplementsNodes.forEach((node) => {
      const supplementaryMaterial = this.createElement('supplementary-material')
      supplementaryMaterial.setAttribute('id', normalizeID(node.attrs.id))
      supplementaryMaterial.setAttributeNS(
        XLINK_NAMESPACE,
        'href',
        node.attrs.href ?? ''
      )
      supplementaryMaterial.setAttribute('mimetype', node.attrs.mimeType ?? '')
      supplementaryMaterial.setAttribute(
        'mime-subtype',
        node.attrs.mimeSubType ?? ''
      )
      const caption = this.createElement('caption')

      const title = this.createElement('title')
      title.textContent = node.attrs.title ?? ''
      caption.append(title)
      supplementaryMaterial.append(caption)
      articleMeta.append(supplementaryMaterial)
    })

    const history =
      articleMeta.querySelector('history') || this.createElement('history')

    if (this.manuscriptNode.attrs.acceptanceDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.acceptanceDate,
        'accepted'
      )
      history.appendChild(date)
    }
    if (this.manuscriptNode.attrs.correctionDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.correctionDate,
        'corrected'
      )
      history.appendChild(date)
    }
    if (this.manuscriptNode.attrs.retractionDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.retractionDate,
        'retracted'
      )
      history.appendChild(date)
    }
    if (this.manuscriptNode.attrs.receiveDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.receiveDate,
        'received'
      )
      history.appendChild(date)
    }
    if (this.manuscriptNode.attrs.revisionReceiveDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.revisionReceiveDate,
        'rev-recd'
      )
      history.appendChild(date)
    }
    if (this.manuscriptNode.attrs.revisionRequestDate) {
      const date = this.buildDateElement(
        this.manuscriptNode.attrs.revisionRequestDate,
        'rev-request'
      )
      history.appendChild(date)
    }

    if (history.childElementCount) {
      articleMeta.appendChild(history)
    }

    this.buildKeywords(articleMeta)

    let countingElements = []
    const figureCount = this.getChildrenOfType(schema.nodes.figure).length
    countingElements.push(this.buildCountingElement('fig-count', figureCount))

    const tableCount = this.getChildrenOfType(schema.nodes.table).length
    countingElements.push(this.buildCountingElement('table-count', tableCount))

    const equationCount = this.getChildrenOfType(
      schema.nodes.equation_element
    ).length
    countingElements.push(
      this.buildCountingElement('equation-count', equationCount)
    )

    const referencesCount = this.getChildrenOfType(
      schema.nodes.bibliography_item
    ).length
    countingElements.push(
      this.buildCountingElement('ref-count', referencesCount)
    )

    //todo: is this correct?
    const wordCount = this.manuscriptNode.textContent.split(/\s+/).length
    countingElements.push(this.buildCountingElement('word-count', wordCount))

    countingElements = countingElements.filter((el) => el) as Array<HTMLElement>
    if (countingElements.length > 0) {
      const counts = this.createElement('counts')
      counts.append(...countingElements)
      articleMeta.append(counts)
    }

    if (!journalMeta.hasChildNodes()) {
      journalMeta.remove()
    }

    const selfUriAttachments = this.getChildrenOfType(schema.nodes.attachment)

    selfUriAttachments.forEach((attachment) => {
      const selfUriElement = this.createElement('self-uri')
      selfUriElement.setAttribute('content-type', attachment.attrs.type)
      selfUriElement.setAttributeNS(
        XLINK_NAMESPACE,
        'href',
        attachment.attrs.href
      )
      const insertBeforeElements = articleMeta.querySelector(
        'related-article, related-object, abstract, trans-abstract, kwd-group, funding-group, support-group, conference, counts, custom-meta-group'
      )
      insertBeforeElements
        ? articleMeta.insertBefore(selfUriElement, insertBeforeElements)
        : articleMeta.appendChild(selfUriElement)
    })

    return front
  }

  protected buildDateElement = (timestamp: number, type: string) => {
    const dateElement = this.createElement('date')

    dateElement.setAttribute('date-type', type)

    const date = new Date(timestamp * 1000) // s => ms
    const lookup = {
      year: date.getUTCFullYear().toString(),
      month: (date.getUTCMonth() + 1).toString().padStart(2, '0'),
      day: date.getUTCDate().toString().padStart(2, '0'),
    }

    for (const [key, value] of Object.entries(lookup).reverse()) {
      const el = this.createElement(key)
      el.textContent = value
      dateElement.appendChild(el)
    }

    return dateElement
  }
  protected buildCountingElement = (
    tagName: string,
    count: number | undefined
  ) => {
    if (count) {
      const wordCount = this.createElement(tagName)
      wordCount.setAttribute('count', String(count))
      return wordCount
    }
  }
  protected buildBody = () => {
    const body = this.createElement('body')
    this.manuscriptNode.forEach((cFragment) => {
      const serializedNode = this.serializeNode(cFragment)
      body.append(...serializedNode.childNodes)
    })
    this.fixBody(body)

    return body
  }

  protected buildBack = (body: HTMLElement) => {
    const back = this.createElement('back')
    this.moveSectionsToBack(back, body)

    // footnotes elements in footnotes section (i.e. not in table footer)
    const footnotesElements = this.document.querySelectorAll('sec > fn-group')

    for (const footnotesElement of footnotesElements) {
      // move fn-group from body to back
      const previousParent = footnotesElement.parentElement
      back.appendChild(footnotesElement)

      if (previousParent) {
        const title = previousParent.querySelector('title')
        if (title) {
          footnotesElement.insertBefore(
            title,
            footnotesElement.firstElementChild
          )
        }
        if (!previousParent.childElementCount) {
          previousParent.remove()
        }
      }
    }
    // bibliography element
    let refList = this.document.querySelector('ref-list')
    if (!refList) {
      warn('No bibliography element, creating a ref-list anyway')
      refList = this.createElement('ref-list')
    }

    // move ref-list from body to back
    back.appendChild(refList)

    const bibliographyItems = this.getChildrenOfType(
      schema.nodes.bibliography_item
    )
    const [meta] = this.citationProvider.makeBibliography()
    for (const [id] of meta.entry_ids) {
      const bibliographyItem = bibliographyItems.find((n) => n.attrs.id === id)
      if (!bibliographyItem) {
        continue
      }
      const ref = this.createElement('ref')
      ref.setAttribute('id', normalizeID(id))
      const getPublicationType = (pubType?: string) =>
        publicationTypeToJats[pubType ?? ''] || pubType || 'journal'

      // in case a literal was found in a bibItem the rest of the attributes are ignored
      // since the literal att should only be populated when the mixed-citation fails to parse

      if (bibliographyItem.attrs.literal) {
        this.appendElement(
          ref,
          'mixed-citation',
          bibliographyItem.attrs.literal,
          {
            'publication-type': getPublicationType(bibliographyItem.attrs.type),
            'specific-use': 'unstructured-citation',
          }
        )
      } else {
        const citation = this.appendElement(
          ref,
          'element-citation',
          undefined,
          {
            'publication-type': getPublicationType(bibliographyItem.attrs.type),
          }
        )

        const attributeHandlers = {
          author: (v: BibliographicName[]) =>
            this.processRefPersonGroup(citation, 'author', v),
          editor: (v: BibliographicName[]) =>
            this.processRefPersonGroup(citation, 'editor', v),
          title: (v: string) =>
            this.setTitleContent(
              this.appendElement(citation, 'article-title'),
              v
            ),
          comment: (v: string) => this.appendElement(citation, 'comment', v),
          'container-title': (v: string) =>
            this.setTitleContent(this.appendElement(citation, 'source'), v),
          issued: ({ 'date-parts': parts }: { 'date-parts': number[][] }) =>
            this.processDateParts(citation, parts),
          volume: (v: string) => this.appendElement(citation, 'volume', v),
          issue: (v: string) => this.appendElement(citation, 'issue', v),
          supplement: (v: string) =>
            this.appendElement(citation, 'supplement', v),
          page: (v: string) => this.processPageString(citation, String(v)),
          DOI: (v: string) =>
            this.appendElement(citation, 'pub-id', v, { 'pub-id-type': 'doi' }),
          std: (v: string) =>
            this.appendElement(citation, 'pub-id', v, {
              'pub-id-type': 'std-designation',
            }),
          'collection-title': (v: string) =>
            this.appendElement(citation, 'series', v),
          edition: (v: string) => this.appendElement(citation, 'edition', v),
          'publisher-place': (v: string) =>
            this.appendElement(citation, 'publisher-loc', v),
          publisher: (v: string) =>
            this.appendElement(citation, 'publisher-name', v),
          event: (v: string) => this.appendElement(citation, 'conf-name', v),
          'event-place': (v: string) =>
            this.appendElement(citation, 'conf-loc', v),
          'number-of-pages': (v: string) =>
            this.appendElement(citation, 'size', v, { units: 'pages' }),
          institution: (v: string) =>
            this.appendElement(citation, 'institution', v),
          locator: (v: string) =>
            this.appendElement(citation, 'elocation-id', v),
          URL: (v: string) =>
            this.appendElement(citation, 'ext-link', v, {
              'ext-link-type': 'uri',
            }),
          'event-date': (v: BibliographicDate) =>
            this.processDate(citation, 'conf-date', v),
          accessed: (v: BibliographicDate) =>
            this.processDate(citation, 'date-in-citation', v),
        }

        Object.entries(attributeHandlers).forEach(([key, handler]) => {
          const value = bibliographyItem.attrs[key]
          if (value) {
            handler(value)
          }
        })
      }

      refList.appendChild(ref)
    }

    return back
  }

  private processDateParts = (parent: HTMLElement, dateParts: number[][]) => {
    const [[year, month, day]] = dateParts
    if (year) {
      this.appendElement(parent, 'year', String(year))
    }
    if (month) {
      this.appendElement(parent, 'month', String(month))
    }
    if (day) {
      this.appendElement(parent, 'day', String(day))
    }
  }

  private processPageString = (parent: HTMLElement, page: string) => {
    const numPattern = /^\d+$/
    const rangePattern = /^(\d+)-(\d+)$/

    if (numPattern.test(page)) {
      this.appendElement(parent, 'fpage', page)
    } else if (rangePattern.test(page)) {
      const [fpage, lpage] = page.split('-')
      this.appendElement(parent, 'fpage', fpage)
      this.appendElement(parent, 'lpage', lpage)
    } else {
      this.appendElement(parent, 'page-range', page)
    }
  }

  private processDate = (
    parent: HTMLElement,
    tag: string,
    date: BibliographicDate
  ) => {
    const buildISODate = (date: BibliographicDate) => {
      const dateParts = date['date-parts']
      if (dateParts && dateParts.length) {
        const [[year, month, day]] = dateParts
        if (year && month && day) {
          return new Date(
            Date.UTC(Number(year), Number(month) - 1, Number(day))
          )
        }
      }
    }

    const isoDate = buildISODate(date)
    if (!isoDate) {
      return
    }
    return this.appendElement(parent, tag, isoDate.toDateString(), {
      'iso-8601-date': isoDate.toISOString(),
    })
  }

  private processRefPersonGroup = (
    citation: HTMLElement,
    type: string,
    people?: BibliographicName[]
  ) => {
    if (!people?.length) {
      return
    }
    const group = this.appendElement(citation, 'person-group', undefined, {
      'person-group-type': type,
    })

    people.forEach((person) => {
      if (person.literal) {
        this.appendElement(group, 'collab', person.literal)
        return
      }

      const name = this.createElement('string-name')
      if (person.family) {
        this.appendElement(name, 'surname', person.family)
      }
      if (person.given) {
        this.appendElement(name, 'given-names', person.given)
      }

      if (name.childNodes.length) {
        group.appendChild(name)
      }
    })
  }
  //@TODO: part of the export cleanup: check if we can use this elsewhere, maybe we can use strategy pattern for each element to have its own creator.
  private createElement = (
    tag: string,
    content?: string,
    attrs?: Record<string, string>
  ) => {
    const el = this.document.createElement(tag)
    if (content) {
      el.textContent = content
    }
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    }
    return el
  }

  private appendElement = (
    parent: HTMLElement,
    tag: string,
    content?: string,
    attrs?: Record<string, string>
  ) => {
    const el = this.createElement(tag, content, attrs)
    parent.appendChild(el)
    return el
  }

  protected createSerializer = () => {
    const nodes: NodeSpecs = {
      hero_image: () => '',
      alt_text: (node) => {
        if (node.textContent) {
          const altText = this.createElement('alt-text')
          altText.textContent = node.textContent
          return altText
        }
        return ''
      },
      long_desc: (node) => {
        if (node.textContent) {
          const longDesc = this.createElement('long-desc')
          longDesc.textContent = node.textContent
          return longDesc
        }
        return ''
      },
      attachment: () => '',
      attachments: () => '',
      image_element: (node) => createImage(node),
      embed: (node) => {
        const mediaElement = this.createElement('media')
        const { id, href, mimetype, mimeSubtype } = node.attrs
        mediaElement.setAttribute('id', normalizeID(id))
        mediaElement.setAttributeNS(XLINK_NAMESPACE, 'show', 'embed')
        if (href) {
          mediaElement.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        }
        if (mimetype) {
          mediaElement.setAttribute('mimetype', node.attrs.mimetype)
        }
        if (mimeSubtype) {
          mediaElement.setAttribute('mime-subtype', node.attrs.mimeSubtype)
        }
        appendLabels(mediaElement, node)
        appendChildNodeOfType(mediaElement, node, schema.nodes.alt_text)
        appendChildNodeOfType(mediaElement, node, schema.nodes.long_desc)
        appendChildNodeOfType(mediaElement, node, schema.nodes.figcaption)
        return mediaElement
      },
      awards: () => ['funding-group', 0],
      award: (node) => {
        const awardGroup = node as AwardNode
        const awardGroupElement = this.createElement('award-group')
        awardGroupElement.setAttribute('id', normalizeID(awardGroup.attrs.id))
        appendChildIfPresent(
          awardGroupElement,
          'funding-source',
          awardGroup.attrs.source
        )
        awardGroup.attrs.code
          .split(';')
          .forEach((code) =>
            appendChildIfPresent(awardGroupElement, 'award-id', code)
          )
        appendChildIfPresent(
          awardGroupElement,
          'principal-award-recipient',
          awardGroup.attrs.recipient
        )

        return awardGroupElement
      },
      box_element: (node) => createBoxElement(node),
      author_notes: () => '',
      corresp: () => '',
      title: () => '',
      alt_title: () => '',
      alt_titles: () => '',
      text_block: (node) => nodes.paragraph(node),
      affiliations: () => '',
      contributors: () => '',
      table_element_footer: (node) =>
        node.childCount == 0
          ? ['table-wrap-foot', ['fn-group', ['fn', ['p']]]]
          : ['table-wrap-foot', 0],
      contributor: () => '',
      affiliation: () => '',
      attribution: () => ['attrib', 0],
      bibliography_element: () => '',
      bibliography_item: () => '',
      comments: () => '',
      keyword_group: () => '',
      body: () => ['body', 0],
      abstracts: () => ['abstract', 0],
      backmatter: () => ['backmatter', 0],
      supplement: () => '',
      supplements: () => '',
      bibliography_section: () => '',
      blockquote_element: () => ['disp-quote', { 'content-type': 'quote' }, 0],
      list: (node) => [
        'list',
        {
          'list-type': node.attrs.listStyleType ?? 'bullet',
        },
        0,
      ],
      caption: () => ['p', 0],
      caption_title: (node) => {
        if (!node.textContent) {
          return ''
        }
        return ['title', 0]
      },
      citation: (node) => {
        const citation = node as CitationNode
        const rids = citation.attrs.rids
        if (!rids.length) {
          return ''
        }

        const xref = this.createElement('xref')
        xref.setAttribute('ref-type', 'bibr')
        xref.setAttribute('rid', normalizeID(rids.join(' ')))
        const citationTextContent = this.citationTexts.get(node.attrs.id)
        if (!citationTextContent) {
          throw new Error(`No citation text found for ${node.attrs.id}`)
        }
        xref.textContent = textFromHTML(citationTextContent)
        return xref
      },
      cross_reference: (node) => {
        const cross = node as CrossReferenceNode
        const rids = cross.attrs.rids
        if (!rids.length) {
          return cross.attrs.label ?? ''
        }

        const rid = rids[0]
        const text = cross.attrs.label || this.labelTargets.get(rid)?.label

        const target = findChildrenByAttr(
          this.manuscriptNode,
          (attrs) => attrs.id === rid
        )[0]?.node
        if (!target) {
          warn('')
          return text || ''
        }

        const xref = this.createElement('xref')

        const type = chooseRefType(target.type)
        if (type) {
          xref.setAttribute('ref-type', type)
        } else {
          warn(`Unset ref-type for schema type ${target.type.name}`)
        }

        xref.setAttribute('rid', normalizeID(rids.join(' ')))
        xref.textContent = text ?? ''

        return xref
      },
      doc: () => '',
      equation: (node) => {
        return this.createEquation(node)
      },
      general_table_footnote: (node) => {
        const el = this.createElement('general-table-footnote')
        el.setAttribute('id', normalizeID(node.attrs.id))
        processChildNodes(el, node, schema.nodes.general_table_footnote)
        return el
      },
      inline_equation: (node) => {
        const eqElement = this.createElement('inline-formula')
        const equation = this.createEquation(node, true)
        eqElement.append(equation)
        return eqElement
      },
      equation_element: (node) => {
        const eqElement = this.createElement('disp-formula')
        eqElement.setAttribute('id', normalizeID(node.attrs.id))
        processChildNodes(eqElement, node, schema.nodes.equation)
        return eqElement
      },
      figcaption: (node) => {
        if (!node.textContent) {
          return ''
        }
        return ['caption', 0]
      },
      figure: (node) => createGraphic(node),
      figure_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.figure),
      footnote: (node) => {
        const attrs: Attrs = {}

        if (node.attrs.id) {
          attrs.id = normalizeID(node.attrs.id)
        }
        if (node.attrs.category) {
          attrs['fn-type'] = node.attrs.category
        }
        return ['fn', attrs, 0]
      },
      footnotes_element: (node) =>
        node.childCount == 0
          ? ['fn-group', { id: normalizeID(node.attrs.id) }, ['fn', ['p']]]
          : ['fn-group', { id: normalizeID(node.attrs.id) }, 0],
      footnotes_section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
          'sec-type': 'endnotes', // chooseSecType(node.attrs.category),
        }

        return ['sec', attrs, 0]
      },
      hard_break: () => '',
      highlight_marker: () => '',
      inline_footnote: (node) => {
        const rids: string[] = node.attrs.rids
        const xref = this.createElement('xref')
        xref.setAttribute('ref-type', 'fn')
        xref.setAttribute('rid', normalizeID(rids.join(' ')))
        xref.textContent = rids
          .map((rid) => this.footnoteLabels.get(rid))
          .join(', ')
        return xref
      },
      keyword: () => '',
      keywords_element: () => '',
      keywords: () => '',
      link: (node) => {
        const text = node.textContent

        if (!text) {
          return ''
        }

        if (!node.attrs.href) {
          return text
        }

        const linkNode = this.createElement('ext-link')
        linkNode.setAttribute('ext-link-type', 'uri')
        linkNode.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        linkNode.textContent = text

        if (node.attrs.title) {
          linkNode.setAttributeNS(
            XLINK_NAMESPACE,
            'xlink:title',
            node.attrs.title
          )
        }

        return linkNode
      },
      list_item: () => ['list-item', 0],
      listing: (node) => {
        const code = this.createElement('code')
        code.setAttribute('id', normalizeID(node.attrs.id))
        code.setAttribute('language', node.attrs.languageKey)
        code.textContent = node.attrs.contents

        return code
      },
      listing_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.listing),
      manuscript: (node) => ['article', { id: normalizeID(node.attrs.id) }, 0],
      missing_figure: () => {
        const graphic = this.createElement('graphic')
        graphic.setAttribute('specific-use', 'MISSING')
        graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', '')
        return graphic
      },
      paragraph: (node) => {
        if (!node.childCount) {
          return ''
        }

        const attrs: Attrs = {}

        if (node.attrs.id) {
          attrs.id = normalizeID(node.attrs.id)
        }

        if (node.attrs.contentType) {
          attrs['content-type'] = node.attrs.contentType
        }

        return ['p', attrs, 0]
      },
      placeholder: () => {
        return this.createElement('boxed-text')
      },
      placeholder_element: () => {
        return this.createElement('boxed-text')
      },
      pullquote_element: (node) => {
        let type = 'pullquote'
        if (node.firstChild?.type === schema.nodes.quote_image) {
          type = 'quote-with-image'
        }
        return ['disp-quote', { 'content-type': type }, 0]
      },
      quote_image: (node) => {
        const img = node as QuoteImageNode
        if (img.attrs.src) {
          return createGraphic(node)
        }
        return ''
      },
      graphical_abstract_section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }
        if (node.attrs.category) {
          attrs['sec-type'] = node.attrs.category
        }
        return ['sec', attrs, 0]
      },
      section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }

        if (node.attrs.category) {
          attrs['sec-type'] = node.attrs.category
        }

        return ['sec', attrs, 0]
      },
      section_label: () => ['label', 0],
      section_title: () => ['title', 0],
      section_title_plain: () => ['title', 0],
      table: (node) => ['table', { id: normalizeID(node.attrs.id) }, 0],
      table_element: (node) => {
        const element = createTableElement(node)
        element.setAttribute('position', 'anchor')
        return element
      },
      table_cell: (node) => [
        'td',
        {
          valign: node.attrs.valign,
          align: node.attrs.align,
          scope: node.attrs.scope,
          style: node.attrs.style,
          ...(node.attrs.rowspan > 1 && { rowspan: node.attrs.rowspan }),
          ...(node.attrs.colspan > 1 && { colspan: node.attrs.colspan }),
        },
        0,
      ],
      table_header: (node) => [
        'th',
        {
          valign: node.attrs.valign,
          align: node.attrs.align,
          scope: node.attrs.scope,
          style: node.attrs.style,
          ...(node.attrs.rowspan > 1 && { rowspan: node.attrs.rowspan }),
          ...(node.attrs.colspan > 1 && { colspan: node.attrs.colspan }),
        },
        0,
      ],
      table_row: () => ['tr', 0],
      table_col: (node) => ['col', { width: node.attrs.width }],
      table_colgroup: () => ['colgroup', 0],
      text: (node) => node.text as string,
      comment: () => '',
    }

    const marks: MarkSpecs = {
      bold: () => ['bold'],
      code: () => ['code', { position: 'anchor' }],
      italic: () => ['italic'],
      smallcaps: () => ['sc'],
      strikethrough: () => ['strike'],
      //I couldn't find any examples for this to test
      styled: () => ['styled-content'],
      superscript: () => ['sup'],
      subscript: () => ['sub'],
      underline: () => ['underline'],
      tracked_insert: () => ['ins'],
      tracked_delete: () => ['del'],
    }

    this.serializer = new DOMSerializer(nodes, marks)
    const appendChildIfPresent = (
      parent: Element,
      tagName: string,
      textContent: string
    ) => {
      if (!textContent) {
        return
      }
      const element = this.createElement(tagName)
      element.textContent = textContent
      parent.appendChild(element)
    }
    const processChildNodes = (
      element: HTMLElement,
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      node.forEach((childNode) => {
        if (childNode.type === contentNodeType) {
          if (childNode.attrs.id) {
            element.appendChild(this.serializeNode(childNode))
          }
        } else if (childNode.type === node.type.schema.nodes.paragraph) {
          element.appendChild(this.serializeNode(childNode))
        } else if (childNode.type === node.type.schema.nodes.missing_figure) {
          element.appendChild(this.serializeNode(childNode))
        }
      })
    }
    const createElement = (node: ManuscriptNode, nodeName: string) => {
      const element = this.createElement(nodeName)
      element.setAttribute('id', normalizeID(node.attrs.id))
      return element
    }

    const appendLabels = (element: HTMLElement, node: ManuscriptNode) => {
      if (this.labelTargets) {
        const target = this.labelTargets.get(node.attrs.id)

        if (target) {
          const label = this.createElement('label')
          label.textContent = target.label
          element.appendChild(label)
        }
      }
    }
    const appendAttributions = (element: HTMLElement, node: ManuscriptNode) => {
      if (node.attrs.attribution) {
        const attribution = this.createElement('attrib')
        attribution.textContent = node.attrs.attribution.literal
        element.appendChild(attribution)
      }
    }
    const appendChildNodeOfType = (
      element: HTMLElement,
      node: ManuscriptNode,
      type: ManuscriptNodeType
    ) => {
      const childNode = this.getFirstChildOfType(type, node)
      if (childNode) {
        element.appendChild(this.serializeNode(childNode))
      }
    }

    const appendTable = (element: HTMLElement, node: ManuscriptNode) => {
      const tableNode = this.getFirstChildOfType(schema.nodes.table, node)
      const colGroupNode = this.getFirstChildOfType(
        schema.nodes.table_colgroup,
        node
      )
      if (!tableNode) {
        return
      }
      const table = this.serializeNode(tableNode)
      const tbodyElement = this.createElement('tbody')

      while (table.firstChild) {
        const child = table.firstChild
        table.removeChild(child)
        tbodyElement.appendChild(child)
      }
      table.appendChild(tbodyElement)
      if (colGroupNode) {
        const colGroup = this.serializeNode(colGroupNode)
        table.insertBefore(colGroup, table.firstChild)
      }

      element.appendChild(table)
    }
    const createBoxElement = (node: ManuscriptNode) => {
      const element = createElement(node, 'boxed-text')
      appendLabels(element, node)
      const child = node.firstChild
      if (child?.type === schema.nodes.figcaption) {
        appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
      }

      processChildNodes(element, node, node.type.schema.nodes.section)
      return element
    }

    const isChildOfNodeType = (
      targetID: string,
      type: NodeType,
      descend = false
    ): boolean => {
      const nodes = this.getChildrenOfType(type)
      return nodes.some((node) => {
        const result = findChildrenByAttr(
          node,
          (attrs) => attrs.id === targetID,
          descend
        )[0]
        return !!result
      })
    }

    const createImage = (node: ManuscriptNode) => {
      const graphicNode = node.content.firstChild
      if (graphicNode) {
        const graphicElement = createGraphic(graphicNode)
        appendChildNodeOfType(graphicElement, node, schema.nodes.alt_text)
        appendChildNodeOfType(graphicElement, node, schema.nodes.long_desc)
        return graphicElement
      }
      return ''
    }

    const createGraphic = (node: ManuscriptNode) => {
      const graphic = this.createElement('graphic')
      graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', node.attrs.src)
      if (
        !isChildOfNodeType(node.attrs.id, schema.nodes.figure_element) &&
        node.attrs.type
      ) {
        graphic.setAttribute('content-type', node.attrs.type)
      }

      return graphic
    }
    const createFigureElement = (
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      const element = createElement(node, 'fig')
      const figNode = this.getFirstChildOfType(schema.nodes.figure, node)
      const figType = figNode?.attrs.type
      if (figType) {
        element.setAttribute('fig-type', figType)
      }
      appendLabels(element, node)
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
      appendChildNodeOfType(element, node, schema.nodes.alt_text)
      appendChildNodeOfType(element, node, schema.nodes.long_desc)
      appendChildNodeOfType(
        element,
        node,
        node.type.schema.nodes.footnotes_element
      )
      processChildNodes(element, node, contentNodeType)
      appendAttributions(element, node)
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, element)
      }
      return element
    }

    const createTableElement = (node: ManuscriptNode) => {
      const nodeName = 'table-wrap'
      const element = createElement(node, nodeName)
      appendLabels(element, node)
      appendChildNodeOfType(element, node, schema.nodes.figcaption)
      appendChildNodeOfType(element, node, schema.nodes.alt_text)
      appendChildNodeOfType(element, node, schema.nodes.long_desc)
      appendTable(element, node)
      appendChildNodeOfType(
        element,
        node,
        node.type.schema.nodes.table_element_footer
      )
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, element)
      }
      return element
    }
    const processExecutableNode = (node: ManuscriptNode, element: Element) => {
      const listingNode = this.getFirstChildOfType(schema.nodes.listing, node)

      if (listingNode) {
        const { contents, languageKey } = listingNode.attrs

        if (contents && languageKey) {
          const listing = this.createElement('fig')
          listing.setAttribute('specific-use', 'source')
          element.appendChild(listing)

          const code = this.createElement('code')
          code.setAttribute('executable', 'true')
          code.setAttribute('language', languageKey)
          code.textContent = contents
          listing.appendChild(code)
        }
      }
    }
  }

  private createEquation(node: ManuscriptNode, isInline = false) {
    if (node.attrs.format === 'tex') {
      const texMath = this.createElement('tex-math')
      texMath.setAttribute('notation', 'LaTeX')
      texMath.setAttribute('version', 'MathJax')
      if (node.attrs.contents.includes('<![CDATA[')) {
        texMath.innerHTML = node.attrs.contents
      } else {
        texMath.innerHTML = `<![CDATA[ ${node.attrs.contents} ]]>`
      }
      return texMath
    } else {
      const math = this.nodeFromJATS(node.attrs.contents)
      const mathml = math as Element
      if (!isInline) {
        mathml.setAttribute('id', normalizeID(node.attrs.id))
      }
      return mathml
    }
  }

  protected serializeNode = (node: ManuscriptNode) =>
    this.serializer.serializeNode(node, {
      document: this.document,
    })

  private validateContributor = (contributor: ContributorNode) => {
    if (!contributor.attrs.bibliographicName) {
      throw new Error(`${contributor.attrs.id} has no bibliographicName`)
    }

    const { family, given } = contributor.attrs.bibliographicName

    if (!family && !given) {
      throw new Error(
        `${contributor.attrs.id} has neither family nor given name`
      )
    }
  }

  private buildContributors = (articleMeta: Node) => {
    const contributorNodes = this.getChildrenOfType<ContributorNode>(
      schema.nodes.contributor
    ).sort(sortContributors)

    const affiliationLabels = new Map<string, number>()
    const creatAffiliationLabel = (rid: string) => {
      let label = affiliationLabels.get(rid)
      if (!label) {
        label = affiliationLabels.size + 1
        affiliationLabels.set(rid, label)
      }
      const sup = this.createElement('sup')
      sup.textContent = String(label)
      return sup
    }
    const createFootNotesLabels = (content: string) => {
      const sup = this.createElement('sup')
      sup.textContent = String(content)
      return sup
    }
    if (contributorNodes.length) {
      const contribGroup = this.createElement('contrib-group')
      contribGroup.setAttribute('content-type', 'authors')
      articleMeta.appendChild(contribGroup)
      contributorNodes.forEach((contributor) => {
        try {
          this.validateContributor(contributor)
        } catch (error: any) {
          warn(error.message)
          return
        }
        const contrib = this.createElement('contrib')
        contrib.setAttribute('contrib-type', 'author')
        contrib.setAttribute('id', normalizeID(contributor.attrs.id))

        if (contributor.attrs.isCorresponding) {
          contrib.setAttribute('corresp', 'yes')
        }
        if (contributor.attrs.role) {
          this.appendElement(contrib, 'role', contributor.attrs.role)
        }

        if (contributor.attrs.ORCIDIdentifier) {
          this.appendElement(
            contrib,
            'contrib-id',
            contributor.attrs.ORCIDIdentifier,
            { 'contrib-id-type': 'orcid' }
          )
        }

        const name = this.buildContributorName(contributor)
        contrib.appendChild(name)

        if (contributor.attrs.email) {
          this.appendElement(contrib, 'email', contributor.attrs.email)
        }
        if (contributor.attrs.affiliations) {
          contributor.attrs.affiliations.forEach((rid) => {
            const xref = this.appendElement(contrib, 'xref', '', {
              'ref-type': 'aff',
              rid: normalizeID(rid),
            })
            xref.appendChild(creatAffiliationLabel(rid))
            contrib.appendChild(xref)
          })
        }

        if (contributor.attrs.footnote) {
          contributor.attrs.footnote.map((note) => {
            const xref = this.appendElement(contrib, 'xref', '', {
              'ref-type': 'fn',
              rid: normalizeID(note.noteID),
            })
            xref.appendChild(createFootNotesLabels(note.noteLabel))
            contrib.appendChild(xref)
          })
        }
        if (contributor.attrs.corresp) {
          contributor.attrs.corresp.map((corresp) => {
            const xref = this.appendElement(contrib, 'xref', '', {
              'ref-type': 'corresp',
              rid: normalizeID(corresp.correspID),
            })
            xref.appendChild(createFootNotesLabels(corresp.correspLabel))
            contrib.appendChild(xref)
          })
        }

        if (contributor.attrs.CRediTRoles) {
          contributor.attrs.CRediTRoles.forEach((cr) => {
            const role = this.createElement('role')
            const creditUrl = CRediTRoleUrls.get(cr.vocabTerm)
            if (creditUrl) {
              role.setAttribute('vocab-identifier', 'http://credit.niso.org/')
              role.setAttribute('vocab', 'CRediT')
              role.setAttribute('vocab-term', cr.vocabTerm)
              role.setAttribute('vocab-term-identifier', creditUrl)
              role.innerHTML = cr.vocabTerm
            }

            contrib.appendChild(role)
          })
        }
        contribGroup.appendChild(contrib)
      })

      const affiliationRIDs: string[] = []

      for (const contributor of contributorNodes) {
        if (contributor.attrs.affiliations) {
          affiliationRIDs.push(...contributor.attrs.affiliations)
        }
      }

      const affiliations = this.getChildrenOfType(schema.nodes.affiliation)

      if (affiliations.length) {
        const usedAffiliations = affiliations.filter((affiliation) =>
          affiliationRIDs.includes(affiliation.attrs.id)
        )
        usedAffiliations.sort(
          (a, b) =>
            affiliationRIDs.indexOf(a.attrs.id) -
            affiliationRIDs.indexOf(b.attrs.id)
        )
        usedAffiliations.forEach((affiliation) => {
          const aff = this.createElement('aff')
          aff.setAttribute('id', normalizeID(affiliation.attrs.id))
          contribGroup.appendChild(aff)
          if (affiliation.attrs.department) {
            const department = this.createElement('institution')
            department.setAttribute('content-type', 'dept')
            department.textContent = affiliation.attrs.department
            aff.appendChild(department)
          }

          if (affiliation.attrs.institution) {
            const institution = this.createElement('institution')
            institution.textContent = affiliation.attrs.institution
            aff.appendChild(institution)
          }

          if (affiliation.attrs.addressLine1) {
            const addressLine = this.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine1
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.addressLine2) {
            const addressLine = this.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine2
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.addressLine3) {
            const addressLine = this.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine3
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.city) {
            const city = this.createElement('city')
            city.textContent = affiliation.attrs.city
            aff.appendChild(city)
          }

          if (affiliation.attrs.country) {
            const country = this.createElement('country')
            country.textContent = affiliation.attrs.country
            aff.appendChild(country)
          }

          if (affiliation.attrs.email) {
            const email = this.createElement('email')
            email.setAttributeNS(
              XLINK_NAMESPACE,
              'href',
              affiliation.attrs.email.href ?? ''
            )
            email.textContent = affiliation.attrs.email.text ?? ''
            aff.appendChild(email)
          }
          const labelNumber = affiliationLabels.get(affiliation.attrs.id)
          if (labelNumber) {
            const label = this.createElement('label')
            label.textContent = String(labelNumber)
            aff.appendChild(label)
          }
        })
      }
      const authorNotesEl = this.createAuthorNotesElement()
      if (authorNotesEl.childNodes.length > 0) {
        articleMeta.insertBefore(authorNotesEl, contribGroup.nextSibling)
      }
    }
  }
  private createAuthorNotesElement = () => {
    const authorNotesEl = this.createElement('author-notes')
    const authorNotesNode = this.getFirstChildOfType<AuthorNotesNode>(
      schema.nodes.author_notes
    )
    if (authorNotesNode) {
      this.appendModelsToAuthorNotes(authorNotesEl, authorNotesNode)
    }
    return authorNotesEl
  }

  private appendModelsToAuthorNotes(
    authorNotesEl: HTMLElement,
    authorNotesNode: AuthorNotesNode
  ) {
    const contributorsNodes = this.getChildrenOfType<ContributorNode>(
      schema.nodes.contributor
    )
    const usedCorrespondings = this.getUsedCorrespondings(contributorsNodes)
    authorNotesNode.descendants((node) => {
      switch (node.type) {
        case schema.nodes.paragraph:
          this.appendParagraphToElement(node as ParagraphNode, authorNotesEl)
          break
        case schema.nodes.footnote:
          this.appendFootnoteToElement(node as FootnoteNode, authorNotesEl)
          break
        case schema.nodes.corresp:
          if (usedCorrespondings.includes(node as CorrespNode)) {
            this.appendCorrespondingToElement(
              node as CorrespNode,
              authorNotesEl
            )
          }
          break
      }
      return false
    })
  }

  private appendCorrespondingToElement = (
    corresponding: CorrespNode,
    element: HTMLElement
  ) => {
    const correspondingEl = this.createElement('corresp')
    correspondingEl.setAttribute('id', normalizeID(corresponding.attrs.id))
    if (corresponding.attrs.label) {
      const labelEl = this.createElement('label')
      labelEl.textContent = corresponding.attrs.label
      correspondingEl.appendChild(labelEl)
    }
    correspondingEl.append(corresponding.textContent)
    element.appendChild(correspondingEl)
  }

  private getUsedCorrespondings(
    contributors: ContributorNode[]
  ): CorrespNode[] {
    return contributors
      .flatMap((c) => c.attrs.corresp ?? [])
      .map((corresp) => {
        return findChildrenByAttr(
          this.manuscriptNode,
          (attr) => attr.id === corresp.correspID
        )[0]?.node
      })
      .filter((corresp): corresp is CorrespNode => !!corresp)
  }

  private appendParagraphToElement = (
    paragraph: ParagraphNode,
    element: HTMLElement
  ) => {
    const parsedDoc = new DOMParser().parseFromString(
      paragraph.textContent,
      'text/html'
    )
    if (parsedDoc.body.innerHTML.length) {
      const paragraphEl = this.createElement('p')
      paragraphEl.innerHTML = parsedDoc.body.innerHTML
      paragraphEl.setAttribute('id', normalizeID(paragraph.attrs.id))
      element.appendChild(paragraphEl)
    }
  }
  private appendFootnoteToElement = (
    footnote: FootnoteNode,
    element: HTMLElement
  ) => {
    const footnoteEl = this.createElement('fn')
    footnoteEl.setAttribute('id', normalizeID(footnote.attrs.id))
    if (!footnote.textContent.includes('<p>')) {
      const p = this.createElement('p')
      p.innerHTML = footnote.textContent
      footnoteEl.appendChild(p)
    } else {
      footnoteEl.innerHTML = footnote.textContent
    }
    element.appendChild(footnoteEl)
  }

  private buildKeywords(articleMeta: Node) {
    const keywordGroups = this.getChildrenOfType(schema.nodes.keyword_group)

    keywordGroups.forEach((group) => {
      const kwdGroup = this.createElement('kwd-group')
      if (group.attrs.type) {
        kwdGroup.setAttribute('kwd-group-type', group.attrs.type)
      }
      articleMeta.appendChild(kwdGroup)
      group.content.forEach((keyword) => {
        const kwd = this.createElement('kwd')
        kwd.textContent = keyword.textContent
        kwdGroup.appendChild(kwd)
      })
      articleMeta.appendChild(kwdGroup)
    })
  }

  private fixBody = (body: Element) => {
    this.manuscriptNode.descendants((node) => {
      if (node.attrs.id) {
        if (
          isNodeType<TableElementFooterNode>(node, 'general_table_footnote')
        ) {
          const generalTableFootnote = body.querySelector(
            `#${normalizeID(node.attrs.id)}`
          )
          if (generalTableFootnote) {
            Array.from(generalTableFootnote.childNodes).forEach((cn) => {
              generalTableFootnote.before(cn)
            })
            generalTableFootnote.remove()
          }
        }
        // move captions to the top of tables
        if (isNodeType<TableElementNode>(node, 'table_element')) {
          const tableElement = body.querySelector(
            `#${normalizeID(node.attrs.id)}`
          )

          if (tableElement) {
            for (const childNode of tableElement.childNodes) {
              switch (childNode.nodeName) {
                case 'caption': {
                  const label = tableElement.querySelector('label')

                  tableElement.insertBefore(
                    childNode,
                    label ? label.nextSibling : tableElement.firstChild
                  )
                  break
                }

                case 'table': {
                  this.fixTable(childNode)
                  break
                }
              }
            }
          }
        }
      }
    })
  }

  private changeTag = (node: Element, tag: string) => {
    const clone = this.createElement(tag)
    for (const attr of node.attributes) {
      clone.setAttributeNS(null, attr.name, attr.value)
    }
    while (node.firstChild) {
      clone.appendChild(node.firstChild)
    }
    node.replaceWith(clone)
    return clone
  }

  private fixTable = (table: ChildNode) => {
    let tbody: Element | undefined

    Array.from(table.childNodes).forEach((child) => {
      if (child instanceof Element && child.tagName.toLowerCase() === 'tbody') {
        tbody = child
      }
    })

    if (!tbody) {
      return
    }

    const tbodyRows = Array.from(tbody.childNodes)
    const thead = this.createElement('thead')
    const tfoot = this.createElement('tfoot')

    tbodyRows.forEach((row, i) => {
      const isRow = row instanceof Element && row.tagName.toLowerCase() === 'tr'
      if (isRow) {
        // we assume that <th scope="col | colgroup"> always belongs to <thead>
        const headerCell = (row as Element).querySelector(
          'th[scope="col"], th[scope="colgroup"]'
        )
        if (i === 0 || headerCell) {
          tbody?.removeChild(row)
          const tableCells = (row as Element).querySelectorAll('td')
          for (const td of tableCells) {
            // for backwards compatibility since older docs use tds for header cells
            this.changeTag(td, 'th')
          }
          thead.appendChild(row)
        } else if (i === tbodyRows.length - 1) {
          tbody?.removeChild(row)
          tfoot.appendChild(row)
        }
      }
    })

    if (thead.hasChildNodes()) {
      table.insertBefore(thead, tbody as Element)
    }

    if (tfoot.hasChildNodes()) {
      table.insertBefore(tfoot, tbody as Element)
    }
  }
  private unwrapBody = (body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="body"]')
    if (!container) {
      return
    }
    const sections = container.querySelectorAll(':scope > sec')
    sections.forEach((section) => {
      body.appendChild(section.cloneNode(true))
    })
    body.removeChild(container)
  }
  private removeBackContainer = (body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="backmatter"]')
    if (!container) {
      return
    }
    const isContainerEmpty = container.children.length === 0
    if (!isContainerEmpty) {
      warn('Backmatter section is not empty.')
    }
    body.removeChild(container)
  }
  private moveAwards = (front: HTMLElement, body: HTMLElement) => {
    const awardGroups = body.querySelectorAll(':scope > award-group')
    if (!awardGroups.length) {
      return
    }
    const fundingGroup = this.createElement('funding-group')
    awardGroups.forEach((award) => {
      fundingGroup.appendChild(award)
    })
    const articleMeta = front.querySelector(':scope > article-meta')

    if (articleMeta) {
      const insertBeforeElement = articleMeta.querySelector(
        ':scope > support-group, :scope > conference, :scope > counts, :scope > custom-meta-group'
      )
      insertBeforeElement
        ? articleMeta.insertBefore(fundingGroup, insertBeforeElement)
        : articleMeta.appendChild(fundingGroup)
    }
  }
  private moveAbstracts = (front: HTMLElement, body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="abstracts"]')
    const abstractsNode = this.getFirstChildOfType(schema.nodes.abstracts)
    const abstractCategories = this.getAbstractCategories(abstractsNode)

    const abstractSections = this.getAbstractSections(
      container,
      body,
      abstractCategories
    )

    if (abstractSections.length) {
      this.processAbstractSections(abstractSections, front)
    }

    if (container) {
      body.removeChild(container)
    }
  }

  private getAbstractCategories(
    abstractsNode: ManuscriptNode | undefined
  ): string[] {
    const categories: string[] = []
    abstractsNode?.content.descendants((node) => {
      categories.push(node.attrs.category)
      return false
    })
    return categories
  }

  private getAbstractSections(
    container: Element | null,
    body: HTMLElement,
    abstractCategories: string[]
  ): Element[] {
    if (container) {
      return Array.from(container.querySelectorAll(':scope > sec'))
    } else {
      const sections = Array.from(body.querySelectorAll(':scope > sec'))
      return sections.filter((section) =>
        this.isAbstractSection(section, abstractCategories)
      )
    }
  }

  private isAbstractSection(
    section: Element,
    abstractCategories: string[]
  ): boolean {
    const sectionType = section.getAttribute('sec-type')
    return sectionType ? abstractCategories.includes(sectionType) : false
  }

  private processAbstractSections(
    abstractSections: Element[],
    front: HTMLElement
  ) {
    for (const abstractSection of abstractSections) {
      const abstractNode = this.createAbstractNode(abstractSection)
      abstractSection.remove()
      const articleMeta = front.querySelector(':scope > article-meta')
      if (articleMeta) {
        insertAbstractNode(articleMeta, abstractNode)
      }
    }
  }

  private createAbstractNode(abstractSection: Element): Element {
    const abstractNode = this.createElement('abstract')
    for (const node of abstractSection.childNodes) {
      if (node.nodeName !== 'title') {
        abstractNode.appendChild(node.cloneNode(true))
      }
    }
    this.setAbstractType(abstractNode, abstractSection)
    return abstractNode
  }

  private setAbstractType(abstractNode: Element, abstractSection: Element) {
    const sectionType = abstractSection.getAttribute('sec-type')
    if (sectionType && sectionType !== 'abstract') {
      const abstractType = sectionType.replace('abstract-', '')
      abstractNode.setAttribute('abstract-type', abstractType)
    }
  }

  private moveSectionsToBack = (back: HTMLElement, body: HTMLElement) => {
    const availabilitySection = body.querySelector(
      'sec[sec-type="availability"]'
    )

    if (availabilitySection) {
      back.insertBefore(availabilitySection, back.firstChild)
    }

    const ethicsSection = body.querySelector('sec[sec-type="ethics-statement"]')
    if (ethicsSection) {
      back.appendChild(ethicsSection)
    }

    const section = body.querySelector('sec[sec-type="acknowledgements"]')

    if (section) {
      const ack = this.createElement('ack')

      while (section.firstChild) {
        ack.appendChild(section.firstChild)
      }

      if (section.parentNode) {
        section.parentNode.removeChild(section)
      }

      back.insertBefore(ack, back.firstChild)
    }
    const appendicesSections = body.querySelectorAll(
      'sec[sec-type="appendices"]'
    )

    if (appendicesSections) {
      const appGroup = this.createElement('app-group')
      appendicesSections.forEach((section) => {
        if (section.parentNode) {
          section.parentNode.removeChild(section)
        }
        const app = this.createElement('app')
        app.appendChild(section)
        appGroup.appendChild(app)
      })
      back.insertBefore(appGroup, back.firstChild)
    }

    const footNotes = []

    const footnoteCategories = [
      'con',
      'conflict',
      'deceased',
      'equal',
      'present-address',
      'presented-at',
      'previously-at',
      'supplementary-material',
      'supported-by',
      'financial-disclosure',
      'coi-statement',
    ]

    const sections = body.querySelectorAll('sec')
    for (const currentSection of sections) {
      const currentSectionType = currentSection.getAttribute('sec-type')
      if (
        currentSectionType &&
        footnoteCategories.indexOf(currentSectionType) >= 0
      ) {
        footNotes.push(
          this.sectionToFootnote(currentSection, currentSectionType)
        )
      }
    }

    if (footNotes.length > 0) {
      const fnGroup = this.createElement('fn-group')
      fnGroup.append(...footNotes)
      back.append(fnGroup)
    }
  }

  sectionToFootnote = (section: Element, fnType: string) => {
    const footNote = this.createElement('fn')
    footNote.setAttribute('fn-type', fnType)
    const title = section.querySelector('title')
    if (title) {
      const footNoteTitle = this.createElement('p')
      footNoteTitle.setAttribute('content-type', 'fn-title')
      footNoteTitle.textContent = title.textContent
      section.removeChild(title)
      footNote.append(footNoteTitle)
    }
    footNote.append(...section.children)
    if (section.parentNode) {
      section.parentNode.removeChild(section)
    }
    return footNote
  }
  private moveFloatsGroup = (article: HTMLElement) => {
    const heroImage = this.getFirstChildOfType(schema.nodes.hero_image)
    if (!heroImage) {
      return
    }
    const floatsGroup = this.createElement('floats-group')
    let figure: HTMLElement | null = null
    heroImage.descendants((node) => {
      if (node.type === schema.nodes.figure) {
        figure = this.serializeNode(node) as HTMLElement
        floatsGroup.appendChild(figure)
      } else {
        const serializedNode = this.serializeNode(node)
        figure?.appendChild(serializedNode)
      }
      return false
    })

    if (floatsGroup.children.length > 0) {
      article.appendChild(floatsGroup)
    }
  }

  private buildContributorName = (contributor: ContributorNode) => {
    const name = this.createElement('name')

    if (contributor.attrs.bibliographicName.family) {
      this.appendElement(
        name,
        'surname',
        contributor.attrs.bibliographicName.family
      )
    }

    if (contributor.attrs.bibliographicName.given) {
      this.appendElement(
        name,
        'given-names',
        contributor.attrs.bibliographicName.given
      )
    }

    if (contributor.attrs.prefix) {
      this.appendElement(name, 'prefix', contributor.attrs.prefix)
    }

    return name
  }

  private moveCoiStatementToAuthorNotes(back: HTMLElement, front: HTMLElement) {
    const fnGroups = back.querySelectorAll('fn-group')
    fnGroups.forEach((fnGroup) => {
      if (fnGroup) {
        const coiStatement = fnGroup.querySelector(
          'fn[fn-type="coi-statement"]'
        )
        if (coiStatement) {
          const authorNotes = this.createElement('author-notes')
          authorNotes.append(coiStatement)
          const articleMeta = front.querySelector('article-meta')
          if (articleMeta) {
            const authorNoteEl = articleMeta.querySelector('author-notes')
            if (authorNoteEl) {
              authorNoteEl.append(...authorNotes.childNodes)
            } else {
              const appendableSelectors = [
                'contrib-group',
                'title-group',
                'article-id',
              ]
              const appendable = [
                ...(articleMeta as HTMLElement).querySelectorAll(
                  appendableSelectors.join(', ')
                ),
              ]
              for (let i = 0; i < appendableSelectors.length; i++) {
                const sel = appendableSelectors[i]
                const match = appendable.find((el) => el.matches(sel))
                if (match) {
                  articleMeta.insertBefore(authorNotes, match.nextSibling)
                  break
                }
              }
            }
          }
          if (!fnGroup.hasChildNodes()) {
            fnGroup.remove()
          }
        }
      }
    })
  }

  private updateFootnoteTypes(front: HTMLElement, body: HTMLElement) {
    const footnotes: Element[] = [...front.querySelectorAll('fn').values()]
    footnotes.push(...body.querySelectorAll('fn'))
    footnotes.forEach((fn) => {
      const fnType = fn.getAttribute('fn-type')
      if (fnType) {
        fn.setAttribute('fn-type', fnType)
      }
    })
  }

  private fillEmptyElements(
    articleElement: Element,
    selector: string,
    tagName = 'p'
  ) {
    const emptyElements = Array.from(
      articleElement.querySelectorAll(selector)
    ).filter((element) => !element.innerHTML)
    emptyElements.forEach((element) =>
      element.appendChild(this.createElement(tagName))
    )
  }

  private fillEmptyFootnotes(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'fn')
  }

  private fillEmptyTableFooters(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'table-wrap-foot')
  }
}
