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
  BibliographicName,
  BibliographyItem,
  Journal,
  ObjectTypes,
} from '@manuscripts/json-schema'
import { CitationProvider } from '@manuscripts/library'
import debug from 'debug'
import {
  DOMOutputSpec,
  DOMParser as ProsemirrorDOMParser,
  DOMSerializer,
} from 'prosemirror-model'
import { findChildrenByAttr, findChildrenByType } from 'prosemirror-utils'
import serializeToXML from 'w3c-xmlserializer'

import { generateFootnoteLabels } from '../../lib/footnotes'
import { nodeFromHTML, textFromHTML } from '../../lib/html'
import {
  AuthorNotesNode,
  CitationNode,
  ContributorNode,
  CorrespNode,
  CrossReferenceNode,
  FootnoteNode,
  isCitationNode,
  ManuscriptMark,
  ManuscriptNode,
  ManuscriptNodeType,
  Marks,
  Nodes,
  ParagraphNode,
  schema,
  TableElementFooterNode,
  TableElementNode,
} from '../../schema'
import { AwardNode } from '../../schema/nodes/award'
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
        _id: node.attrs.id,
        issued: node.attrs.issued,
        DOI: node.attrs.doi,
        manuscriptID,
        objectType: ObjectTypes.BibliographyItem,
        author: node.attrs.author,
        'container-title': node.attrs.containerTitle,
        volume: node.attrs.volume,
        issue: node.attrs.issue,
        supplement: node.attrs.supplement,
        page: node.attrs.page,
        title: node.attrs.title,
        literal: node.attrs.literal,
        //@ts-ignore
        type: node.attrs.type,
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
  public serializeToJATS = async (
    manuscriptNode: ManuscriptNode,
    options: ExportOptions
  ): Promise<string> => {
    this.manuscriptNode = manuscriptNode
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
    this.moveFloatsGroup(body, article)
    this.removeBackContainer(body)
    this.updateFootnoteTypes(front, back)
    this.fillEmptyTableFooters(article)
    this.fillEmptyFootnotes(article)
    this.moveAwards(front, body)
    await this.rewriteIDs()
    return serializeToXML(this.document)
  }

  private nodeFromJATS = (JATSFragment: string) => {
    JATSFragment = JATSFragment.trim()
    JATSFragment = JATSFragment.replace('&nbsp;', ' ')

    if (!JATSFragment.length) {
      return null
    }

    const template = this.document.createElement('template')

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
    const titleNode = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.title
    )[0]?.node

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/front.html
    const front = this.document.createElement('front')

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/journal-meta.html
    const journalMeta = this.document.createElement('journal-meta')
    front.appendChild(journalMeta)

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/article-meta.html
    const articleMeta = this.document.createElement('article-meta')
    front.appendChild(articleMeta)

    if (journal) {
      if (journal.journalIdentifiers) {
        for (const item of journal.journalIdentifiers) {
          const element = this.document.createElement('journal-id')
          if (item.journalIDType) {
            element.setAttribute('journal-id-type', item.journalIDType)
          }
          element.textContent = item.journalID
          journalMeta.appendChild(element)
        }
      }

      if (journal.title || journal.abbreviatedTitles) {
        const parentElement = this.document.createElement('journal-title-group')
        journalMeta.appendChild(parentElement)

        if (journal.title) {
          const element = this.document.createElement('journal-title')
          element.textContent = journal.title
          parentElement.appendChild(element)
        }

        if (journal.abbreviatedTitles) {
          for (const item of journal.abbreviatedTitles) {
            const element = this.document.createElement('abbrev-journal-title')
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
          const element = this.document.createElement('issn')
          if (item.publicationType) {
            element.setAttribute('pub-type', item.publicationType)
          }
          element.textContent = item.ISSN
          journalMeta.appendChild(element)
        }
      }

      if (journal.publisherName) {
        const publisher = this.document.createElement('publisher')
        const publisherName = this.document.createElement('publisher-name')
        publisherName.textContent = journal.publisherName
        publisher.appendChild(publisherName)
        journalMeta.appendChild(publisher)
      }
    }
    if (this.manuscriptNode.attrs.doi) {
      const articleID = this.document.createElement('article-id')
      articleID.setAttribute('pub-id-type', 'doi')
      // @ts-ignore
      articleID.textContent = this.manuscriptNode.attrs.doi
      articleMeta.appendChild(articleID)
    }

    const titleGroup = this.document.createElement('title-group')
    articleMeta.appendChild(titleGroup)

    this.buildContributors(articleMeta)
    if (titleNode) {
      const element = this.document.createElement('article-title')
      this.setTitleContent(element, titleNode.textContent)
      titleGroup.appendChild(element)
    }

    const supplementsNodes = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.supplement
    )
    supplementsNodes.forEach(({ node }) => {
      const supplementaryMaterial = this.document.createElement(
        'supplementary-material'
      )
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
      const caption = this.document.createElement('caption')

      const title = this.document.createElement('title')
      title.textContent = node.attrs.title ?? ''
      caption.append(title)
      supplementaryMaterial.append(caption)
      articleMeta.append(supplementaryMaterial)
    })

    const history =
      articleMeta.querySelector('history') ||
      this.document.createElement('history')

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
    const figureCount = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.figure
    ).length
    countingElements.push(this.buildCountingElement('fig-count', figureCount))

    const tableCount = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.table
    ).length
    countingElements.push(this.buildCountingElement('table-count', tableCount))

    const equationCount = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.equation_element
    ).length
    countingElements.push(
      this.buildCountingElement('equation-count', equationCount)
    )

    const referencesCount = findChildrenByType(
      this.manuscriptNode,
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
      const counts = this.document.createElement('counts')
      counts.append(...countingElements)
      articleMeta.append(counts)
    }

    if (!journalMeta.hasChildNodes()) {
      journalMeta.remove()
    }

    return front
  }

  protected buildDateElement = (timestamp: number, type: string) => {
    const dateElement = this.document.createElement('date')

    dateElement.setAttribute('date-type', type)

    const date = new Date(timestamp * 1000) // s => ms
    const lookup = {
      year: date.getUTCFullYear().toString(),
      month: (date.getUTCMonth() + 1).toString().padStart(2, '0'),
      day: date.getUTCDate().toString().padStart(2, '0'),
    }

    for (const [key, value] of Object.entries(lookup).reverse()) {
      const el = this.document.createElement(key)
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
      const wordCount = this.document.createElement(tagName)
      wordCount.setAttribute('count', String(count))
      return wordCount
    }
  }
  protected buildBody = () => {
    const body = this.document.createElement('body')
    this.manuscriptNode.forEach((cFragment) => {
      const serializedNode = this.serializeNode(cFragment)
      body.append(...serializedNode.childNodes)
    })
    this.fixBody(body)

    return body
  }

  protected buildBack = (body: HTMLElement) => {
    const back = this.document.createElement('back')
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
      refList = this.document.createElement('ref-list')
    }

    // move ref-list from body to back
    back.appendChild(refList)

    const bibliographyItems = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.bibliography_item
    ).map((n) => n.node)
    const [meta] = this.citationProvider.makeBibliography()
    for (const [id] of meta.entry_ids) {
      const bibliographyItem = bibliographyItems.find((n) => n.attrs.id === id)
      if (!bibliographyItem) {
        continue
      }
      const ref = this.document.createElement('ref')
      ref.setAttribute('id', normalizeID(id))

      // TODO: add option for mixed-citation; format citations using template
      // TODO: add citation elements depending on publication type
      const updateCitationPubType = (
        citationEl: HTMLElement,
        pubType: string
      ) => {
        if (pubType) {
          switch (pubType) {
            case 'article':
            case 'article-journal':
              citationEl.setAttribute('publication-type', 'journal')
              break
            default:
              citationEl.setAttribute('publication-type', pubType)
              break
          }
        } else {
          citationEl.setAttribute('publication-type', 'journal')
        }
      }
      // in case a literal was found in a bibItem the rest of the attributes are ignored
      // since the literal att should only be populated when the mixed-citation fails to parse
      if (bibliographyItem.attrs.literal) {
        const mixedCitation = this.document.createElement('mixed-citation')
        updateCitationPubType(mixedCitation, bibliographyItem.attrs.type)
        mixedCitation.textContent = bibliographyItem.attrs.literal
        ref.appendChild(mixedCitation)
        refList.appendChild(ref)
      } else {
        const citation = this.document.createElement('element-citation')
        updateCitationPubType(citation, bibliographyItem.attrs.type)
        if (bibliographyItem.attrs.author) {
          const personGroupNode = this.document.createElement('person-group')
          personGroupNode.setAttribute('person-group-type', 'author')
          citation.appendChild(personGroupNode)

          bibliographyItem.attrs.author.forEach((author: BibliographicName) => {
            const name = this.document.createElement('string-name')

            if (author.family) {
              const node = this.document.createElement('surname')
              node.textContent = author.family
              name.appendChild(node)
            }
            if (author.given) {
              const node = this.document.createElement('given-names')
              node.textContent = author.given
              name.appendChild(node)
            }
            if (name.hasChildNodes()) {
              personGroupNode.appendChild(name)
            }
            if (author.literal) {
              const collab = this.document.createElement('collab')
              collab.textContent = author.literal
              personGroupNode.appendChild(collab)
            }
          })
        }

        if (bibliographyItem.attrs.issued) {
          const dateParts = bibliographyItem.attrs.issued['date-parts']

          if (dateParts && dateParts.length) {
            const [[year, month, day]] = dateParts

            if (year) {
              const node = this.document.createElement('year')
              node.textContent = String(year)
              citation.appendChild(node)
            }

            if (month) {
              const node = this.document.createElement('month')
              node.textContent = String(month)
              citation.appendChild(node)
            }

            if (day) {
              const node = this.document.createElement('day')
              node.textContent = String(day)
              citation.appendChild(node)
            }
          }
        }

        if (bibliographyItem.attrs.title) {
          const node = this.document.createElement('article-title')
          this.setTitleContent(node, bibliographyItem.attrs.title)
          citation.appendChild(node)
        }

        if (bibliographyItem.attrs.containerTitle) {
          const node = this.document.createElement('source')
          this.setTitleContent(node, bibliographyItem.attrs.containerTitle)
          citation.appendChild(node)
        }

        if (bibliographyItem.attrs.volume) {
          const node = this.document.createElement('volume')
          node.textContent = String(bibliographyItem.attrs.volume)
          citation.appendChild(node)
        }

        if (bibliographyItem.attrs.issue) {
          const node = this.document.createElement('issue')
          node.textContent = String(bibliographyItem.attrs.issue)
          citation.appendChild(node)
        }

        if (bibliographyItem.attrs.supplement) {
          const node = this.document.createElement('supplement')
          node.textContent = bibliographyItem.attrs.supplement
          citation.appendChild(node)
        }

        if (bibliographyItem.attrs.page) {
          const pageString = String(bibliographyItem.attrs.page)

          if (/^\d+$/.test(pageString)) {
            const node = this.document.createElement('fpage')
            node.textContent = pageString
            citation.appendChild(node)
          } else if (/^\d+-\d+$/.test(pageString)) {
            const [fpage, lpage] = pageString.split('-')

            const fpageNode = this.document.createElement('fpage')
            fpageNode.textContent = fpage
            citation.appendChild(fpageNode)

            const lpageNode = this.document.createElement('lpage')
            lpageNode.textContent = lpage
            citation.appendChild(lpageNode)
          } else {
            // TODO: check page-range contents?
            const node = this.document.createElement('page-range')
            node.textContent = pageString
            citation.appendChild(node)
          }
        }
        if (bibliographyItem.attrs.doi) {
          const node = this.document.createElement('pub-id')
          node.setAttribute('pub-id-type', 'doi')
          node.textContent = String(bibliographyItem.attrs.doi)
          citation.appendChild(node)
        }

        ref.appendChild(citation)
        refList.appendChild(ref)
      }
    }

    return back
  }

  protected createSerializer = () => {
    const nodes: NodeSpecs = {
      image_element: (node) =>
        node.content.firstChild
          ? createGraphic(node.content.firstChild, false)
          : '',
      embed: (node) => {
        const mediaElement = this.document.createElement('media')
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
        appendChildNodeOfType(mediaElement, node, node.type.schema.nodes.figcaption)
        return mediaElement
      },
      awards: () => ['funding-group', 0],
      award: (node) => {
        const awardGroup = node as AwardNode
        const awardGroupElement = this.document.createElement('award-group')
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

        const xref = this.document.createElement('xref')
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

        const xref = this.document.createElement('xref')

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
        const el = this.document.createElement('general-table-footnote')
        el.setAttribute('id', normalizeID(node.attrs.id))
        processChildNodes(el, node, schema.nodes.general_table_footnote)
        return el
      },
      inline_equation: (node) => {
        const eqElement = this.document.createElement('inline-formula')
        const equation = this.createEquation(node, true)
        eqElement.append(equation)
        return eqElement
      },
      equation_element: (node) => {
        const eqElement = this.document.createElement('disp-formula')
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
        const xref = this.document.createElement('xref')
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

        const linkNode = this.document.createElement('ext-link')
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
        const code = this.document.createElement('code')
        code.setAttribute('id', normalizeID(node.attrs.id))
        code.setAttribute('language', node.attrs.languageKey)
        code.textContent = node.attrs.contents

        return code
      },
      listing_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.listing),
      manuscript: (node) => ['article', { id: normalizeID(node.attrs.id) }, 0],
      missing_figure: () => {
        const graphic = this.document.createElement('graphic')
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
        return this.document.createElement('boxed-text')
      },
      placeholder_element: () => {
        return this.document.createElement('boxed-text')
      },
      pullquote_element: () => [
        'disp-quote',
        { 'content-type': 'pullquote' },
        0,
      ],
      graphical_abstract_section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }
        attrs['sec-type'] = 'abstract-graphical'

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
      const element = this.document.createElement(tagName)
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
      const element = this.document.createElement(nodeName)
      element.setAttribute('id', normalizeID(node.attrs.id))
      return element
    }

    const appendLabels = (element: HTMLElement, node: ManuscriptNode) => {
      if (this.labelTargets) {
        const target = this.labelTargets.get(node.attrs.id)

        if (target) {
          const label = this.document.createElement('label')
          label.textContent = target.label
          element.appendChild(label)
        }
      }
    }
    const appendAttributions = (element: HTMLElement, node: ManuscriptNode) => {
      if (node.attrs.attribution) {
        const attribution = this.document.createElement('attrib')
        attribution.textContent = node.attrs.attribution.literal
        element.appendChild(attribution)
      }
    }
    const appendChildNodeOfType = (
      element: HTMLElement,
      node: ManuscriptNode,
      type: ManuscriptNodeType
    ) => {
      const childNode = findChildrenByType(node, type)[0]?.node
      if (childNode) {
        element.appendChild(this.serializeNode(childNode))
      }
    }

    const appendTable = (element: HTMLElement, node: ManuscriptNode) => {
      const tableNode = findChildrenByType(
        node,
        node.type.schema.nodes.table
      )[0]?.node
      const colGroupNode = findChildrenByType(
        node,
        node.type.schema.nodes.table_colgroup
      )[0]?.node
      if (!tableNode) {
        return
      }
      const table = this.serializeNode(tableNode)
      const tbodyElement = this.document.createElement('tbody')

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
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
      processChildNodes(element, node, node.type.schema.nodes.section)
      return element
    }
    const createGraphic = (node: ManuscriptNode, isChildOfFigure = true) => {
      const graphic = this.document.createElement('graphic')
      graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', node.attrs.src)
      if (!isChildOfFigure && node.attrs.type) {
        graphic.setAttribute('content-type', node.attrs.type)
      }
      return graphic
    }
    const createFigureElement = (
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      const element = createElement(node, 'fig')
      const figNode = findChildrenByType(node, node.type.schema.nodes.figure)[0]
      const figType = figNode?.node.attrs.type
      if (figType) {
        element.setAttribute('fig-type', figType)
      }
      appendLabels(element, node)
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
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
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
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
      const listingNode = findChildrenByType(
        node,
        node.type.schema.nodes.listing
      )[0]?.node

      if (listingNode) {
        const { contents, languageKey } = listingNode.attrs

        if (contents && languageKey) {
          const listing = this.document.createElement('fig')
          listing.setAttribute('specific-use', 'source')
          element.appendChild(listing)

          const code = this.document.createElement('code')
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
      const texMath = this.document.createElement('tex-math')
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
    const contributorNodes = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.contributor
    ).map((result) => result.node) as ContributorNode[]
    const authorContributorNodes = contributorNodes
      .filter((n) => n.attrs.role === 'author')
      .sort(sortContributors)
    const otherContributorsNodes = contributorNodes
      .filter((n) => n.attrs.role !== 'author')
      .sort(sortContributors)

    const affiliationLabels = new Map<string, number>()
    const creatAffiliationLabel = (rid: string) => {
      let label = affiliationLabels.get(rid)
      if (!label) {
        label = affiliationLabels.size + 1
        affiliationLabels.set(rid, label)
      }
      const sup = this.document.createElement('sup')
      sup.textContent = String(label)
      return sup
    }
    const createFootNotesLabels = (content: string) => {
      const sup = this.document.createElement('sup')
      sup.textContent = String(content)
      return sup
    }
    if (authorContributorNodes.length) {
      const contribGroup = this.document.createElement('contrib-group')
      contribGroup.setAttribute('content-type', 'authors')
      articleMeta.appendChild(contribGroup)
      authorContributorNodes.forEach((contributor) => {
        try {
          this.validateContributor(contributor)
        } catch (error: any) {
          warn(error.message)
          return
        }
        const contrib = this.document.createElement('contrib')
        contrib.setAttribute('contrib-type', 'author')
        contrib.setAttribute('id', normalizeID(contributor.attrs.id))

        if (contributor.attrs.isCorresponding) {
          contrib.setAttribute('corresp', 'yes')
        }

        if (contributor.attrs.ORCIDIdentifier) {
          const identifier = this.document.createElement('contrib-id')
          identifier.setAttribute('contrib-id-type', 'orcid')
          identifier.textContent = contributor.attrs.ORCIDIdentifier
          contrib.appendChild(identifier)
        }

        const name = this.buildContributorName(contributor)
        contrib.appendChild(name)

        if (contributor.attrs.email) {
          const email = this.document.createElement('email')
          email.textContent = contributor.attrs.email
          contrib.appendChild(email)
        }
        if (contributor.attrs.affiliations) {
          contributor.attrs.affiliations.forEach((rid) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'aff')
            xref.setAttribute('rid', normalizeID(rid))
            xref.appendChild(creatAffiliationLabel(rid))
            contrib.appendChild(xref)
          })
        }

        if (contributor.attrs.footnote) {
          contributor.attrs.footnote.map((note) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'fn')
            xref.setAttribute('rid', normalizeID(note.noteID))
            xref.appendChild(createFootNotesLabels(note.noteLabel))
            contrib.appendChild(xref)
          })
        }
        if (contributor.attrs.corresp) {
          contributor.attrs.corresp.map((corresp) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'corresp')
            xref.setAttribute('rid', normalizeID(corresp.correspID))
            xref.appendChild(createFootNotesLabels(corresp.correspLabel))
            contrib.appendChild(xref)
          })
        }
        contribGroup.appendChild(contrib)
      })
      if (otherContributorsNodes.length) {
        const contribGroup = this.document.createElement('contrib-group')
        articleMeta.appendChild(contribGroup)
        otherContributorsNodes.forEach((contributor) => {
          try {
            this.validateContributor(contributor)
          } catch (error: any) {
            warn(error.message)
            return
          }
          const contrib = this.document.createElement('contrib')
          contrib.setAttribute('id', normalizeID(contributor.attrs.id))

          const name = this.buildContributorName(contributor)
          contrib.appendChild(name)

          if (contributor.attrs.email) {
            const email = this.document.createElement('email')
            email.textContent = contributor.attrs.email
            contrib.appendChild(email)
          }
          if (contributor.attrs.affiliations) {
            contributor.attrs.affiliations.forEach((rid) => {
              const xref = this.document.createElement('xref')
              xref.setAttribute('ref-type', 'aff')
              xref.setAttribute('rid', normalizeID(rid))
              xref.appendChild(creatAffiliationLabel(rid))
              contrib.appendChild(xref)
            })
          }
          if (contributor.attrs.footnote) {
            contributor.attrs.footnote.map((note) => {
              const xref = this.document.createElement('xref')
              xref.setAttribute('ref-type', 'fn')
              xref.setAttribute('rid', normalizeID(note.noteID))
              xref.appendChild(createFootNotesLabels(note.noteLabel))
              contrib.appendChild(xref)
            })
          }

          contribGroup.appendChild(contrib)
        })
      }
      const affiliationRIDs: string[] = []
      const sortedContributors = [
        ...authorContributorNodes,
        ...otherContributorsNodes,
      ]
      for (const contributor of sortedContributors) {
        if (contributor.attrs.affiliations) {
          affiliationRIDs.push(...contributor.attrs.affiliations)
        }
      }

      const affiliations = findChildrenByType(
        this.manuscriptNode,
        schema.nodes.affiliation
      ).map((result) => result.node)

      if (affiliations) {
        const usedAffiliations = affiliations.filter((affiliation) =>
          affiliationRIDs.includes(affiliation.attrs.id)
        )
        usedAffiliations.sort(
          (a, b) =>
            affiliationRIDs.indexOf(a.attrs.id) -
            affiliationRIDs.indexOf(b.attrs.id)
        )
        usedAffiliations.forEach((affiliation) => {
          const aff = this.document.createElement('aff')
          aff.setAttribute('id', normalizeID(affiliation.attrs.id))
          contribGroup.appendChild(aff)
          if (affiliation.attrs.department) {
            const department = this.document.createElement('institution')
            department.setAttribute('content-type', 'dept')
            department.textContent = affiliation.attrs.department
            aff.appendChild(department)
          }

          if (affiliation.attrs.institution) {
            const institution = this.document.createElement('institution')
            institution.textContent = affiliation.attrs.institution
            aff.appendChild(institution)
          }

          if (affiliation.attrs.addressLine1) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine1
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.addressLine2) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine2
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.addressLine3) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.attrs.addressLine3
            aff.appendChild(addressLine)
          }

          if (affiliation.attrs.city) {
            const city = this.document.createElement('city')
            city.textContent = affiliation.attrs.city
            aff.appendChild(city)
          }

          if (affiliation.attrs.country) {
            const country = this.document.createElement('country')
            country.textContent = affiliation.attrs.country
            aff.appendChild(country)
          }

          if (affiliation.attrs.email) {
            const email = this.document.createElement('email')
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
            const label = this.document.createElement('label')
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
    const authorNotesEl = this.document.createElement('author-notes')
    const authorNotesNode = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.author_notes
    )[0]?.node
    if (authorNotesNode) {
      this.appendModelsToAuthorNotes(
        authorNotesEl,
        authorNotesNode as AuthorNotesNode
      )
    }
    return authorNotesEl
  }
  private appendModelsToAuthorNotes(
    authorNotesEl: HTMLElement,
    authorNotesNode: AuthorNotesNode
  ) {
    const contributorsNodes = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.contributor
    ).map((result) => result.node) as ContributorNode[]
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
    const correspondingEl = this.document.createElement('corresp')
    correspondingEl.setAttribute('id', normalizeID(corresponding.attrs.id))
    if (corresponding.attrs.label) {
      const labelEl = this.document.createElement('label')
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
      .map(
        (corresp) =>
          findChildrenByAttr(
            this.manuscriptNode,
            (attr) => attr.id === corresp.correspID
          )[0]?.node
      )
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
    const parsedParagraph = parsedDoc.body.querySelector('p')
    if (parsedParagraph) {
      const paragraphEl = this.document.createElement('p')
      paragraphEl.innerHTML = parsedParagraph.innerHTML
      paragraphEl.setAttribute('id', normalizeID(paragraph.attrs.id))
      element.appendChild(paragraphEl)
    }
  }
  private appendFootnoteToElement = (
    footnote: FootnoteNode,
    element: HTMLElement
  ) => {
    const footnoteEl = this.document.createElement('fn')
    footnoteEl.setAttribute('id', normalizeID(footnote.attrs.id))
    if (!footnote.textContent.includes('<p>')) {
      const p = this.document.createElement('p')
      p.innerHTML = footnote.textContent
      footnoteEl.appendChild(p)
    } else {
      footnoteEl.innerHTML = footnote.textContent
    }
    element.appendChild(footnoteEl)
  }
  private buildKeywords(articleMeta: Node) {
    const keywordGroups = findChildrenByType(
      this.manuscriptNode,
      schema.nodes.keyword_group
    ).map((result) => result.node)

    keywordGroups.forEach((group) => {
      const kwdGroup = this.document.createElement('kwd-group')
      if (group.attrs.type) {
        kwdGroup.setAttribute('kwd-group-type', group.attrs.type)
      }
      articleMeta.appendChild(kwdGroup)
      group.content.forEach((keyword) => {
        const kwd = this.document.createElement('kwd')
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
    const clone = this.document.createElement(tag)
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
    const thead = this.document.createElement('thead')
    const tfoot = this.document.createElement('tfoot')

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
    const fundingGroup = this.document.createElement('funding-group')
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
    let abstractSections
    if (container) {
      abstractSections = Array.from(container.querySelectorAll(':scope > sec'))
    } else {
      abstractSections = Array.from(
        body.querySelectorAll(':scope > sec')
      ).filter((section) => {
        const sectionType = section.getAttribute('sec-type')

        if (
          sectionType === 'abstract' ||
          sectionType === 'abstract-teaser' ||
          sectionType === 'abstract-graphical'
        ) {
          return true
        }

        const sectionTitle = section.querySelector(':scope > title')

        if (!sectionTitle) {
          return false
        }

        return sectionTitle.textContent === 'Abstract'
      })
    }
    if (abstractSections.length) {
      for (const abstractSection of abstractSections) {
        const abstractNode = this.document.createElement('abstract')

        // TODO: ensure that abstract section schema is valid
        for (const node of abstractSection.childNodes) {
          if (node.nodeName !== 'title') {
            abstractNode.appendChild(node.cloneNode(true))
          }
        }

        const sectionType = abstractSection.getAttribute('sec-type')

        if (sectionType && sectionType !== 'abstract') {
          const [, abstractType] = sectionType.split('-', 2)
          abstractNode.setAttribute('abstract-type', abstractType)
        }

        abstractSection.remove()

        const articleMeta = front.querySelector(':scope > article-meta')

        if (articleMeta) {
          insertAbstractNode(articleMeta, abstractNode)
        }
      }
    }
    if (container) {
      body.removeChild(container)
    }
  }

  private moveSectionsToBack = (back: HTMLElement, body: HTMLElement) => {
    const availabilitySection = body.querySelector(
      'sec[sec-type="availability"]'
    )

    if (availabilitySection) {
      back.insertBefore(availabilitySection, back.firstChild)
    }

    const section = body.querySelector('sec[sec-type="acknowledgements"]')

    if (section) {
      const ack = this.document.createElement('ack')

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
      const appGroup = this.document.createElement('app-group')
      appendicesSections.forEach((section) => {
        if (section.parentNode) {
          section.parentNode.removeChild(section)
        }
        const app = this.document.createElement('app')
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
      'ethics-statement',
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
      const fnGroup = this.document.createElement('fn-group')
      fnGroup.append(...footNotes)
      back.append(fnGroup)
    }
  }

  sectionToFootnote = (section: Element, fnType: string) => {
    const footNote = this.document.createElement('fn')
    footNote.setAttribute('fn-type', fnType)
    const title = section.querySelector('title')
    if (title) {
      const footNoteTitle = this.document.createElement('p')
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
  private moveFloatsGroup = (body: HTMLElement, article: HTMLElement) => {
    const floatsGroup = this.document.createElement('floats-group')
    const section = body.querySelector('sec[sec-type="floating-element"]')
    if (section) {
      floatsGroup.append(...section.children)

      if (section?.parentNode) {
        section.parentNode.removeChild(section)
      }
      article.appendChild(floatsGroup)
    }
  }

  private buildContributorName = (contributor: ContributorNode) => {
    const name = this.document.createElement('name')

    if (contributor.attrs.bibliographicName.family) {
      const surname = this.document.createElement('surname')
      surname.textContent = contributor.attrs.bibliographicName.family
      name.appendChild(surname)
    }

    if (contributor.attrs.bibliographicName.given) {
      const givenNames = this.document.createElement('given-names')
      givenNames.textContent = contributor.attrs.bibliographicName.given
      name.appendChild(givenNames)
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
          const authorNotes = this.document.createElement('author-notes')
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
      element.appendChild(this.document.createElement(tagName))
    )
  }

  private fillEmptyFootnotes(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'fn')
  }

  private fillEmptyTableFooters(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'table-wrap-foot')
  }
}
