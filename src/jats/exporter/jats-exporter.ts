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

import * as Citeproc from 'citeproc'
import { DOMOutputSpec, DOMSerializer, type NodeType } from 'prosemirror-model'
import { findChildrenByAttr, findChildrenByType } from 'prosemirror-utils'
import serializeToXML from 'w3c-xmlserializer'

import { buildCiteprocCitation } from '../../lib/citeproc'
import { CreditRoleUrls } from '../../lib/credit-roles'
import { generateFootnoteLabels } from '../../lib/footnotes'
import { FOOTNOTE_SECTION_CATEGORY_IDS } from '../../lib/section-categories'
import {
  sanitizeXmlString,
  XLINK_NAMESPACE,
  XML_NAMESPACE,
} from '../../lib/xml'
import {
  ActualManuscriptNode,
  AffiliationNode,
  AuthorNotesNode,
  AwardNode,
  CitationNode,
  ContributorNode,
  CorrespNode,
  CrossReferenceNode,
  FootnoteNode,
  FootnotesSectionNode,
  isBibliographyItemNode,
  isCitationNode,
  isFootnotesSectionNode,
  isNodeOfType,
  ManuscriptMark,
  ManuscriptNode,
  ManuscriptNodeType,
  Marks,
  Nodes,
  ParagraphNode,
  QuoteImageNode,
  schema,
  SectionNode,
} from '../../schema'
import { isExecutableNodeType } from '../../transformer'
import { IDGenerator } from '../types'
import { initJats, jatsVariableWrapper } from './citeproc'
import { selectVersionIds, Version } from './jats-versions'
import { buildTargets, Target } from './labels'

interface Attrs {
  [key: string]: string
}

type NodeSpecs = { [key in Nodes]: (node: ManuscriptNode) => DOMOutputSpec }

type MarkSpecs = {
  [key in Marks]: (mark: ManuscriptMark, inline: boolean) => DOMOutputSpec
}

interface BackRouting {
  bodyNodes: ManuscriptNode[]
  backmatterNodes: ManuscriptNode[]
  availability?: SectionNode
  ethicsStatement?: SectionNode
  acknowledgements?: SectionNode
  appendices: SectionNode[]
  footnoteSections: SectionNode[]
  footnoteGroups: FootnotesSectionNode[]
  extracted: Set<ManuscriptNode>
}

const normalizeID = (id: string) => id.replace(/:/g, '_')

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
    case schema.nodes.abstract:
      return 'sec'

    case schema.nodes.equation:
    case schema.nodes.equation_element:
      return 'disp-formula'
  }
}
export type CSLOptions = {
  style: string
  locale: string
}
export type ExportOptions = {
  version?: Version
  csl: CSLOptions
}

//todo: this doesn't need to be a class, we only care about serializeToJats
export class JATSExporter {
  protected document: Document
  protected serializer: DOMSerializer
  protected labelTargets: Map<string, Target>
  protected footnoteLabels: Map<string, string>
  protected manuscriptNode: ActualManuscriptNode
  private engine: Citeproc.Engine
  private renderedCitations: Map<string, string>
  private nodesMap: Map<NodeType, ManuscriptNode[]> = new Map()
  private contributorLabels: Map<string, number> = new Map()
  private extractedSections: Set<ManuscriptNode> = new Set()

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
    manuscriptNode: ActualManuscriptNode,
    options: ExportOptions
  ): Promise<string> => {
    this.manuscriptNode = manuscriptNode
    this.populateNodesMap()
    this.initCiteprocEngine(options)
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
    this.labelTargets = buildTargets(
      manuscriptNode.descendants.bind(manuscriptNode)
    )
    this.footnoteLabels = generateFootnoteLabels(manuscriptNode)
    const $front = this.buildFront()
    article.appendChild($front)
    article.setAttribute(
      'article-type',
      manuscriptNode.attrs.articleType || 'other'
    )
    article.setAttributeNS(
      XML_NAMESPACE,
      'lang',
      manuscriptNode.attrs.primaryLanguageCode || 'en'
    )
    const routing = this.computeBackRouting()
    const $back = this.buildBack(routing)
    this.moveCoiStatementToAuthorNotes($back, $front)
    this.extractedSections = routing.extracted
    const $body = this.buildBody(routing)
    article.appendChild($body)
    article.appendChild($back)
    this.addParagraphsToSections(article)
    this.fillEmptyTableFooters(article)
    this.fillEmptyFootnotes(article)
    this.fillEmptyListItem(article)
    const $floatsGroup = this.buildFloatsGroup()
    if ($floatsGroup) {
      article.appendChild($floatsGroup)
    }
    await this.rewriteIDs()
    return serializeToXML(this.document)
  }

  private appendChildNodeOfType = (
    $element: HTMLElement,
    node: ManuscriptNode,
    type: ManuscriptNodeType
  ) => {
    const childNode = this.getFirstChildOfType(type, node)
    if (childNode) {
      $element.appendChild(this.serializeNode(childNode))
    }
  }

  private appendChildrenNodeOfType = (
    $element: HTMLElement,
    node: ManuscriptNode,
    type: ManuscriptNodeType
  ) => {
    const children = this.getChildrenOfType(type, node)
    children.map((childNode) =>
      $element.appendChild(this.serializeNode(childNode))
    )
  }

  protected appendCaption = ($element: HTMLElement, node: ManuscriptNode) => {
    const $caption = this.createElement('caption')
    this.appendChildNodeOfType($caption, node, schema.nodes.caption_title)
    const captionNode = this.getChildrenOfType(schema.nodes.caption, node)[0]
    if (captionNode && captionNode.content.size > 2) {
      this.appendChildrenNodeOfType(
        $caption,
        captionNode,
        schema.nodes.text_block
      )
    }
    if ($caption.children.length > 0) {
      $element.appendChild($caption)
    }
  }
  private initCiteprocEngine = (options: ExportOptions) => {
    const { csl } = options
    const bibitems: Map<string, CSL.Data> = new Map()
    const citations: Map<string, Citeproc.Citation> = new Map()
    const citedItemIDs: Set<string> = new Set()

    this.manuscriptNode.descendants((n) => {
      if (isBibliographyItemNode(n)) {
        bibitems.set(n.attrs.id, n.attrs as CSL.Data)
      }
      if (isCitationNode(n)) {
        citations.set(n.attrs.id, buildCiteprocCitation(n.attrs))
        n.attrs.rids.forEach((rid: string) => citedItemIDs.add(rid))
      }
    })

    initJats()
    const engine = new Citeproc.Engine(
      {
        retrieveLocale: () => csl.locale,
        retrieveItem: (id: string) => {
          const item = bibitems.get(id)
          if (!item) {
            throw Error(`Missing bibliography item with id ${id}`)
          }
          return item
        },
        variableWrapper: jatsVariableWrapper,
      },
      csl.style
    )
    engine.setOutputFormat('jats')

    const uncitedItemIDs = [...bibitems.keys()].filter(
      (id) => !citedItemIDs.has(id)
    )

    const output = engine.rebuildProcessorState(
      [...citations.values()],
      undefined,
      uncitedItemIDs
    )

    this.engine = engine
    this.renderedCitations = new Map(output.map((i) => [i[0], i[2]]))
  }

  private nodeFromJATS = (JATSFragment: string) => {
    JATSFragment = JATSFragment.trim()
    JATSFragment = JATSFragment.replace('&nbsp;', ' ')

    if (!JATSFragment.length) {
      return null
    }

    const $template = this.createElement('template')

    $template.innerHTML = JATSFragment

    return $template.firstChild
  }

  protected rewriteIDs = async (
    generator: IDGenerator = createDefaultIdGenerator()
  ) => {
    const ids = new Map<string, string | null>()

    for (const $element of this.document.querySelectorAll('[id]')) {
      const oldID = $element.getAttribute('id')
      const newID = await generator($element)

      if (newID) {
        $element.setAttribute('id', newID)
      } else {
        $element.removeAttribute('id')
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

  protected buildFront = () => {
    const $front = this.createElement('front')
    const $articleMeta = this.createElement('article-meta')
    $front.appendChild($articleMeta)

    const contributors = this.getChildrenOfType<ContributorNode>(
      schema.nodes.contributor
    ).sort((a, b) => Number(a.attrs.priority) - Number(b.attrs.priority))
    this.contributorLabels = this.computeContributorLabels(contributors)
    const frontNodes = [
      this.buildArticleId(),
      this.buildTitleGroup(),
      this.buildContributorGroup(contributors),
      //todo: coi statement is later added to author notes too
      this.buildAuthorNotes(),
      this.buildSupplements(),
      this.buildHistory(),
      this.buildSelfUris(),
      this.buildAbstracts(),
      this.buildKeywords(),
      this.buildAwards(),
      this.buildCounts(),
    ]

    frontNodes.forEach((nodes) => this.appendChildren($articleMeta, nodes))
    return $front
  }

  private appendChildren = (
    parent: HTMLElement,
    elements?: Node | Node[] | null
  ) => {
    if (!elements) {
      return
    }
    const list = Array.isArray(elements) ? elements : [elements]
    list.forEach(($element) => parent.appendChild($element))
  }

  private buildArticleId = (): Element | undefined => {
    if (this.manuscriptNode.attrs.doi) {
      const $articleID = this.createElement('article-id')
      $articleID.setAttribute('pub-id-type', 'doi')
      $articleID.textContent = this.manuscriptNode.attrs.doi
      return $articleID
    }
  }

  private buildTitleGroup = (): Element => {
    const $titleGroup = this.createElement('title-group')

    const titleNode = this.getFirstChildOfType(schema.nodes.title)
    if (titleNode) {
      $titleGroup.appendChild(this.serializeNode(titleNode))
    }

    this.getChildrenOfType(schema.nodes.subtitle).forEach((node) =>
      $titleGroup.appendChild(this.serializeNode(node))
    )

    this.getChildrenOfType(schema.nodes.alt_title).forEach((node) =>
      $titleGroup.appendChild(this.serializeNode(node))
    )

    return $titleGroup
  }

  private buildSupplements = (): Node[] =>
    this.getChildrenOfType(schema.nodes.supplement).map((node) =>
      this.serializeNode(node)
    )

  private buildHistory = (): Element | undefined => {
    const $history = this.createElement('history')
    const dates: Array<[number | undefined, string]> = [
      [this.manuscriptNode.attrs.acceptanceDate, 'accepted'],
      [this.manuscriptNode.attrs.correctionDate, 'corrected'],
      [this.manuscriptNode.attrs.retractionDate, 'retracted'],
      [this.manuscriptNode.attrs.receiveDate, 'received'],
      [this.manuscriptNode.attrs.revisionReceiveDate, 'rev-recd'],
      [this.manuscriptNode.attrs.revisionRequestDate, 'rev-request'],
    ]
    dates.forEach(([timestamp, type]) => {
      if (timestamp) {
        $history.appendChild(this.buildDateElement(timestamp, type))
      }
    })

    if ($history.childElementCount) {
      return $history
    }
  }

  private buildCounts = (): Element | undefined => {
    const countingElements = [
      this.buildCountingElement(
        'fig-count',
        this.getChildrenOfType(schema.nodes.figure).length
      ),
      this.buildCountingElement(
        'table-count',
        this.getChildrenOfType(schema.nodes.table).length
      ),
      this.buildCountingElement(
        'equation-count',
        this.getChildrenOfType(schema.nodes.equation_element).length
      ),
      this.buildCountingElement(
        'ref-count',
        this.getChildrenOfType(schema.nodes.bibliography_item).length
      ),
      //todo: is this correct?
      this.buildCountingElement(
        'word-count',
        this.manuscriptNode.textContent.split(/\s+/).length
      ),
    ].filter(($element): $element is HTMLElement => Boolean($element))

    if (countingElements.length > 0) {
      const $counts = this.createElement('counts')
      $counts.append(...countingElements)
      return $counts
    }
  }

  private buildAwards = (): Node | undefined => {
    const awards = this.getFirstChildOfType(schema.nodes.awards)
    if (!awards || !awards.childCount) {
      return
    }
    return this.serializeNode(awards)
  }

  private buildSelfUris = (): Node[] =>
    this.getChildrenOfType(schema.nodes.attachment).map((attachment) =>
      this.serializeNode(attachment)
    )

  protected buildDateElement = (timestamp: number, type: string) => {
    const $dateElement = this.createElement('date')

    $dateElement.setAttribute('date-type', type)

    const date = new Date(timestamp * 1000) // s => ms
    const lookup = {
      year: date.getUTCFullYear().toString(),
      month: (date.getUTCMonth() + 1).toString().padStart(2, '0'),
      day: date.getUTCDate().toString().padStart(2, '0'),
    }

    for (const [key, value] of Object.entries(lookup).reverse()) {
      const $datePart = this.createElement(key)
      $datePart.textContent = value
      $dateElement.appendChild($datePart)
    }

    return $dateElement
  }
  protected buildCountingElement = (
    tagName: string,
    count: number | undefined
  ) => {
    if (count) {
      const $countElement = this.createElement(tagName)
      $countElement.setAttribute('count', String(count))
      return $countElement
    }
  }
  private getContainerNodes = (type: NodeType): ManuscriptNode[] => {
    const container = this.getFirstChildOfType(type)
    const nodes: ManuscriptNode[] = []
    container?.forEach((node) => nodes.push(node))
    return nodes
  }

  private getBodyNodes = (): ManuscriptNode[] => {
    const bodyNodes: ManuscriptNode[] = []
    this.getContainerNodes(schema.nodes.body).forEach((node) => {
      if (
        node.type === schema.nodes.section &&
        node.attrs.category === 'body'
      ) {
        node.forEach((child) => {
          if (child.type === schema.nodes.section) {
            bodyNodes.push(child)
          }
        })
        return
      }
      bodyNodes.push(node)
    })
    return bodyNodes
  }

  private getBackmatterNodes = (): ManuscriptNode[] =>
    this.getContainerNodes(schema.nodes.backmatter)

  // Walks the body and backmatter containers once and decides, for every
  // section (at any nesting depth), whether it belongs in a specific back
  // structure. Sections whose content is pulled into `back` are excluded
  // from normal body serialization via `extractedSections`
  // (see the `section`/`footnotes_section` node specs) instead of being
  // serialized into <body> and then queried back out.
  //
  // This always walks the full tree, including descendants of an already
  // -extracted section. The only case that affects is a backmatter-category
  // section nested inside another one (e.g. a coi-statement inside an
  // availability section), which is independently extracted too rather than
  // riding along embedded in its parent's output - a deliberate
  // simplification, since that nesting is not a realistic document shape.

  //todo: can we use section categories instead of traversing/hardcoding these sections here (some sections do not have a group defined in section categories)
  private computeBackRouting = (): BackRouting => {
    const bodyNodes = this.getBodyNodes()
    const backmatterNodes = this.getBackmatterNodes()

    const routing: BackRouting = {
      bodyNodes,
      backmatterNodes,
      appendices: [],
      footnoteSections: [],
      footnoteGroups: [],
      extracted: new Set(),
    }

    const classify = (node: ManuscriptNode) => {
      if (isFootnotesSectionNode(node)) {
        routing.footnoteGroups.push(node)
        routing.extracted.add(node)
        return
      }

      if (node.type !== schema.nodes.section) {
        return
      }

      const section = node as SectionNode
      switch (section.attrs.category) {
        case 'availability':
          if (routing.availability) {
            return
          }
          routing.availability = section
          break
        case 'ethics-statement':
          if (routing.ethicsStatement) {
            return
          }
          routing.ethicsStatement = section
          break
        case 'acknowledgements':
          if (routing.acknowledgements) {
            return
          }
          routing.acknowledgements = section
          break
        case 'appendices':
          routing.appendices.push(section)
          break
        default:
          if (!FOOTNOTE_SECTION_CATEGORY_IDS.includes(section.attrs.category)) {
            return
          }
          routing.footnoteSections.push(section)
      }
      routing.extracted.add(section)
    }

    const walk = (nodes: ManuscriptNode[]) => {
      nodes.forEach((node) => {
        classify(node)
        node.descendants(classify)
      })
    }

    walk(bodyNodes)
    walk(backmatterNodes)

    return routing
  }

  protected buildBody = (routing: BackRouting) => {
    const $body = this.createElement('body')
    ;[...routing.bodyNodes, ...routing.backmatterNodes].forEach((node) => {
      if (routing.extracted.has(node)) {
        return
      }
      $body.appendChild(this.serializeNode(node))
    })

    return $body
  }

  protected buildBack = (routing: BackRouting) => {
    const $back = this.createElement('back')

    if (routing.availability) {
      $back.insertBefore(
        this.serializeNode(routing.availability),
        $back.firstChild
      )
    }
    if (routing.acknowledgements) {
      const $section = this.serializeNode(routing.acknowledgements) as Element
      $back.insertBefore(
        this.sectionToAcknowledgement($section),
        $back.firstChild
      )
    }
    if (routing.appendices.length) {
      const $appGroup = this.createElement('app-group')
      routing.appendices.forEach((section) => {
        const $app = this.createElement('app')
        $app.appendChild(this.serializeNode(section))
        $appGroup.appendChild($app)
      })
      $back.insertBefore($appGroup, $back.firstChild)
    }
    if (routing.ethicsStatement) {
      $back.appendChild(this.serializeNode(routing.ethicsStatement))
    }

    if (routing.footnoteSections.length) {
      const $footnotes = routing.footnoteSections.map((section) => {
        const $section = this.serializeNode(section) as Element
        return this.sectionToFootnote($section, section.attrs.category)
      })
      const $fnGroup = this.createElement('fn-group')
      $fnGroup.append(...$footnotes)
      $back.appendChild($fnGroup)
    }

    routing.footnoteGroups.forEach((footnotesSection) => {
      const $serializedNode = this.serializeNode(footnotesSection)
      if (!($serializedNode instanceof Element)) {
        return
      }
      const $fnGroup = $serializedNode.querySelector(':scope > fn-group')
      if (!$fnGroup) {
        return
      }
      const $title = $serializedNode.querySelector(':scope > title')
      if ($title) {
        $fnGroup.insertBefore($title, $fnGroup.firstElementChild)
      }
      $back.appendChild($fnGroup)
    })

    // bibliography element
    let $refList = this.document.querySelector('ref-list')
    if (!$refList) {
      $refList = this.createElement('ref-list')
    }

    // move ref-list from body to back
    $back.appendChild($refList)
    const parser = new DOMParser()
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, bibliography] = this.engine.makeBibliography()

    for (let i = 0; i < bibliography.length; i++) {
      const item = `<template xmlns:xlink="${XLINK_NAMESPACE}">${sanitizeXmlString(bibliography[i])}</template>`
      const $ref = parser.parseFromString(item, 'text/xml').querySelector('ref')
      if ($ref) {
        $refList.appendChild($ref)
      }
    }

    return $back
  }

  //@TODO: part of the export cleanup: check if we can use this elsewhere, maybe we can use strategy pattern for each element to have its own creator.
  private createElement = (
    tag: string,
    content?: string,
    attrs?: Record<string, string | undefined>
  ) => {
    const $element = this.document.createElement(tag)
    if (content) {
      $element.textContent = content
    }
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v) {
          $element.setAttribute(k, v)
        }
      })
    }
    return $element
  }

  private appendElement = (
    parent: HTMLElement,
    tag: string,
    content?: string,
    attrs?: Record<string, string | undefined>
  ) => {
    const $element = this.createElement(tag, content, attrs)
    parent.appendChild($element)
    return $element
  }

  //todo: its probably a good idea to move this into its own file, this file is 2k lines long
  protected createSerializer = () => {
    const nodes: NodeSpecs = {
      trans_abstract: (node) => createTransAbstract(node),
      trans_graphical_abstract: (node) => createTransAbstract(node),
      hero_image: () => '',
      headshot_grid: () => ['p', { 'content-type': 'headshots' }, 0],
      headshot_element: (node) => createImage(node),
      headshot_image: () => '',
      alt_text: (node) => {
        if (node.textContent) {
          const $altText = this.createElement('alt-text')
          $altText.textContent = node.textContent
          return $altText
        }
        return ''
      },
      long_desc: (node) => {
        if (node.textContent) {
          const $longDesc = this.createElement('long-desc')
          $longDesc.textContent = node.textContent
          return $longDesc
        }
        return ''
      },
      attachment: (node) => {
        const $selfUri = this.createElement('self-uri')
        $selfUri.setAttribute('content-type', node.attrs.type)
        $selfUri.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        return $selfUri
      },
      attachments: () => '',
      image_element: (node) => createImage(node),
      embed: (node) => {
        const { id, href, mimetype, mimeSubtype } = node.attrs
        if (!href) {
          return ''
        }
        const $mediaElement = this.createElement('media')
        $mediaElement.setAttribute('id', normalizeID(id))
        $mediaElement.setAttributeNS(XLINK_NAMESPACE, 'show', 'embed')
        $mediaElement.setAttributeNS(XLINK_NAMESPACE, 'href', href)
        if (mimetype) {
          $mediaElement.setAttribute('mimetype', node.attrs.mimetype)
        }
        if (mimeSubtype) {
          $mediaElement.setAttribute('mime-subtype', node.attrs.mimeSubtype)
        }
        appendLabels($mediaElement, node)
        this.appendChildNodeOfType($mediaElement, node, schema.nodes.alt_text)
        this.appendChildNodeOfType($mediaElement, node, schema.nodes.long_desc)
        this.appendCaption($mediaElement, node)
        return $mediaElement
      },
      awards: () => ['funding-group', 0],
      award: (node) => {
        const awardGroup = node as AwardNode
        const $awardGroupElement = this.createElement('award-group')
        $awardGroupElement.setAttribute('id', normalizeID(awardGroup.attrs.id))
        appendChildIfPresent(
          $awardGroupElement,
          'funding-source',
          awardGroup.attrs.source
        )
        awardGroup.attrs.code
          ?.split(';')
          .forEach((code) =>
            appendChildIfPresent($awardGroupElement, 'award-id', code)
          )
        appendChildIfPresent(
          $awardGroupElement,
          'principal-award-recipient',
          awardGroup.attrs.recipient
        )

        return $awardGroupElement
      },
      box_element: (node) => createBoxElement(node),
      author_notes: (node) =>
        this.serializeAuthorNotes(node as AuthorNotesNode),
      corresp: () => '',
      title: () => ['article-title', 0],
      alt_title: (node) => [
        'alt-title',
        { 'alt-title-type': node.attrs.type },
        0,
      ],
      alt_titles: () => '',
      subtitle: () => ['subtitle', 0],
      subtitles: () => '',
      text_block: (node) => nodes.paragraph(node),
      affiliations: () => '',
      contributors: () => '',
      table_element_footer: (node) =>
        node.childCount == 0
          ? ['table-wrap-foot', ['fn-group', ['fn', ['p']]]]
          : ['table-wrap-foot', 0],
      contributor: (node) =>
        this.buildContributorElement(node as ContributorNode),
      affiliation: (node) =>
        this.buildAffiliationElement(node as AffiliationNode),
      attribution: () => ['attrib', 0],
      bibliography_element: () => '',
      bibliography_item: () => '',
      comments: () => '',
      keyword_group: (node) => {
        const attrs: { [key: string]: string } = {}
        if (node.attrs.type) {
          attrs['kwd-group-type'] = node.attrs.type
        }
        return ['kwd-group', attrs, 0]
      },
      body: () => ['body', 0],
      abstracts: () => ['abstract', 0],
      backmatter: () => ['backmatter', 0],
      supplement: (node) => {
        const $supplementaryMaterial = this.createElement(
          'supplementary-material'
        )
        $supplementaryMaterial.setAttribute('id', normalizeID(node.attrs.id))
        $supplementaryMaterial.setAttributeNS(
          XLINK_NAMESPACE,
          'href',
          node.attrs.href ?? ''
        )
        $supplementaryMaterial.setAttribute(
          'mimetype',
          node.attrs.mimeType ?? ''
        )
        $supplementaryMaterial.setAttribute(
          'mime-subtype',
          node.attrs.mimeSubType ?? ''
        )
        this.appendCaption($supplementaryMaterial, node)
        return $supplementaryMaterial
      },
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

        const $xref = this.createElement('xref')
        $xref.setAttribute('ref-type', 'bibr')
        $xref.setAttribute('rid', normalizeID(rids.join(' ')))
        const fragment = this.renderedCitations.get(node.attrs.id)
        if (fragment) {
          $xref.innerHTML = fragment
        }
        return $xref
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
          return text ?? ''
        }

        const $xref = this.createElement('xref')

        const type = chooseRefType(target.type)
        if (type) {
          $xref.setAttribute('ref-type', type)
        }

        $xref.setAttribute('rid', normalizeID(rids.join(' ')))
        $xref.textContent = text ?? ''

        return $xref
      },
      doc: () => '',
      equation: (node) => {
        return node.attrs.contents ? this.createEquation(node) : ''
      },
      general_table_footnote: (node) => {
        const $fragment = this.document.createDocumentFragment()
        node.forEach((child) => {
          $fragment.appendChild(this.serializeNode(child))
        })
        return $fragment
      },
      inline_equation: (node) => {
        if (!node.attrs.contents) {
          return ''
        }
        const $equationElement = this.createElement('inline-formula')
        const equation = this.createEquation(node, true)
        $equationElement.append(equation)
        return $equationElement
      },
      equation_element: (node) => {
        const $equationElement = this.createElement('disp-formula')
        $equationElement.setAttribute('id', normalizeID(node.attrs.id))
        appendLabels($equationElement, node)
        processChildNodes($equationElement, node, schema.nodes.equation)
        return $equationElement
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
        if (this.extractedSections.has(node)) {
          return ''
        }
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
          'sec-type': 'endnotes',
        }

        return ['sec', attrs, 0]
      },
      hard_break: () => '',
      highlight_marker: () => '',
      inline_footnote: (node) => {
        const rids: string[] = node.attrs.rids
        const $xref = this.createElement('xref')
        $xref.setAttribute('ref-type', 'fn')
        $xref.setAttribute('rid', normalizeID(rids.join(' ')))
        $xref.textContent = rids
          .map((rid) => this.footnoteLabels.get(rid))
          .join(', ')
        return $xref
      },
      keyword: () => ['kwd', 0],
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

        const $linkNode = this.createElement('ext-link')
        $linkNode.setAttribute('ext-link-type', 'uri')
        $linkNode.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        $linkNode.textContent = text

        if (node.attrs.title) {
          $linkNode.setAttributeNS(
            XLINK_NAMESPACE,
            'xlink:title',
            node.attrs.title
          )
        }

        return $linkNode
      },
      list_item: () => ['list-item', 0],
      listing: (node) => {
        const $code = this.createElement('code')
        $code.setAttribute('id', normalizeID(node.attrs.id))
        $code.setAttribute('language', node.attrs.languageKey)
        $code.textContent = node.attrs.contents

        return $code
      },
      listing_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.listing),
      manuscript: (node) => ['article', { id: normalizeID(node.attrs.id) }, 0],
      missing_figure: () => {
        const $graphic = this.createElement('graphic')
        $graphic.setAttribute('specific-use', 'MISSING')
        $graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', '')
        return $graphic
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
        const attrs: { [key: string]: string } = {}
        if (node.attrs.type) {
          attrs['content-type'] = node.attrs.type
        }
        return ['disp-quote', attrs, 0]
      },
      quote_image: (node) => {
        const img = node as QuoteImageNode
        if (img.attrs.src) {
          return createGraphic(node)
        }
        return ''
      },
      graphical_abstract_section: (node) => createAbstract(node),
      section: (node) => {
        if (this.extractedSections.has(node)) {
          return ''
        }
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }

        if (node.attrs.category) {
          attrs['sec-type'] = node.attrs.category
        }

        return ['sec', attrs, 0]
      },
      abstract: (node) => createAbstract(node),
      section_label: () => ['label', 0],
      section_title: () => ['title', 0],
      section_title_plain: () => ['title', 0],
      table: (node) => ['table', { id: normalizeID(node.attrs.id) }, 0],
      table_element: (node) => {
        const $element = createTableElement(node)
        $element.setAttribute('position', 'anchor')
        if (node.attrs.type) {
          $element.setAttribute('content-type', node.attrs.type)
        }
        return $element
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
      const $element = this.createElement(tagName)
      $element.textContent = textContent
      parent.appendChild($element)
    }
    const processChildNodes = (
      $element: HTMLElement,
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      node.forEach((childNode) => {
        if (childNode.type === contentNodeType) {
          if (childNode.attrs.id) {
            $element.appendChild(this.serializeNode(childNode))
          }
        } else if (childNode.type === node.type.schema.nodes.paragraph) {
          $element.appendChild(this.serializeNode(childNode))
        } else if (childNode.type === node.type.schema.nodes.missing_figure) {
          $element.appendChild(this.serializeNode(childNode))
        }
      })
    }
    const createElement = (node: ManuscriptNode, nodeName: string) => {
      const $element = this.createElement(nodeName)
      $element.setAttribute('id', normalizeID(node.attrs.id))
      return $element
    }

    const appendLabels = ($element: HTMLElement, node: ManuscriptNode) => {
      if (this.labelTargets) {
        const target = this.labelTargets.get(node.attrs.id)

        if (target) {
          const $label = this.createElement('label')
          $label.textContent = target.label
          $element.appendChild($label)
        }
      }
    }
    const appendAttributions = (
      $element: HTMLElement,
      node: ManuscriptNode
    ) => {
      if (node.attrs.attribution) {
        const $attribution = this.createElement('attrib')
        $attribution.textContent = node.attrs.attribution.literal
        $element.appendChild($attribution)
      }
    }

    const appendTable = ($element: HTMLElement, node: ManuscriptNode) => {
      const tableNode = this.getFirstChildOfType(schema.nodes.table, node)
      const colGroupNode = this.getFirstChildOfType(
        schema.nodes.table_colgroup,
        node
      )
      if (!tableNode) {
        return
      }
      const $table = this.serializeNode(tableNode)
      const $tbodyElement = this.createElement('tbody')

      while ($table.firstChild) {
        const $child = $table.firstChild
        $table.removeChild($child)
        $tbodyElement.appendChild($child)
      }
      $table.appendChild($tbodyElement)
      this.normalizeTable($table)
      if (colGroupNode) {
        const $colGroup = this.serializeNode(colGroupNode)
        $table.insertBefore($colGroup, $table.firstChild)
      }

      $element.appendChild($table)
    }
    const createBoxElement = (node: ManuscriptNode) => {
      const $element = createElement(node, 'boxed-text')
      if (node.attrs.type) {
        $element.setAttribute('content-type', node.attrs.type)
      }
      appendLabels($element, node)
      const child = node.firstChild
      if (child?.type === schema.nodes.caption_title) {
        this.appendCaption($element, node)
      }

      processChildNodes($element, node, node.type.schema.nodes.section)
      return $element
    }

    const abstractTypeAttrs = (category: string) =>
      category && category !== 'abstract' ? { 'abstract-type': category } : {}

    const createAbstract = (node: ManuscriptNode): DOMOutputSpec => [
      'abstract',
      abstractTypeAttrs(node.attrs.category),
      0,
    ]

    const createTransAbstract = (node: ManuscriptNode): DOMOutputSpec => [
      'trans-abstract',
      {
        [`${XML_NAMESPACE} lang`]: node.attrs.lang ?? '',
        ...abstractTypeAttrs(node.attrs.category),
      },
      0,
    ]

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

    const findParentHeroImage = (targetID: string) => {
      const heroes = this.getChildrenOfType(schema.nodes.hero_image)
      return heroes.find(
        (hero) =>
          !!findChildrenByAttr(hero, (attrs) => attrs.id === targetID)[0]
      )
    }

    const createImage = (node: ManuscriptNode) => {
      const graphicNode = node.content.firstChild
      if (!graphicNode) {
        return ''
      }
      const graphicElement = createGraphic(graphicNode)
      if (node.attrs.extLink) {
        const extLink = this.appendElement(graphicElement, 'ext-link')
        extLink.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.extLink)
      }
      this.appendCaption(graphicElement, node)
      this.appendChildNodeOfType(graphicElement, node, schema.nodes.alt_text)
      this.appendChildNodeOfType(graphicElement, node, schema.nodes.long_desc)
      return graphicElement
    }

    const createGraphic = (node: ManuscriptNode) => {
      const $graphic = this.createElement('graphic')
      $graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', node.attrs.src)

      const hero = findParentHeroImage(node.attrs.id)
      if (hero) {
        $graphic.setAttribute('content-type', hero.attrs.type || 'leading')
      } else if (
        !isChildOfNodeType(node.attrs.id, schema.nodes.figure_element) &&
        node.attrs.type
      ) {
        $graphic.setAttribute('content-type', node.attrs.type)
      }
      return $graphic
    }
    const createFigureElement = (
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      const $element = createElement(node, 'fig')
      const figNode = this.getFirstChildOfType(schema.nodes.figure, node)
      const figType = figNode?.attrs.type
      if (figType) {
        $element.setAttribute('fig-type', figType)
      }
      appendLabels($element, node)
      this.appendCaption($element, node)
      this.appendChildNodeOfType($element, node, schema.nodes.alt_text)
      this.appendChildNodeOfType($element, node, schema.nodes.long_desc)
      this.appendChildNodeOfType(
        $element,
        node,
        node.type.schema.nodes.footnotes_element
      )
      processChildNodes($element, node, contentNodeType)
      appendAttributions($element, node)
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, $element)
      }
      moveAltTextAndLongDescToGraphics($element)
      return $element
    }

    const moveAltTextAndLongDescToGraphics = ($element: Element) => {
      const $altText = $element.querySelector('alt-text')
      const $longDesc = $element.querySelector('long-desc')
      const $graphics = $element.querySelectorAll('graphic')

      if ($graphics.length === 0) {
        return
      }

      $graphics.forEach(($graphic) => {
        if ($longDesc) {
          $graphic.prepend($longDesc.cloneNode(true))
        }
        if ($altText) {
          $graphic.prepend($altText.cloneNode(true))
        }
      })

      $altText?.remove()
      $longDesc?.remove()
    }

    const createTableElement = (node: ManuscriptNode) => {
      const nodeName = 'table-wrap'
      const $element = createElement(node, nodeName)
      appendLabels($element, node)
      this.appendCaption($element, node)
      this.appendChildNodeOfType($element, node, schema.nodes.alt_text)
      this.appendChildNodeOfType($element, node, schema.nodes.long_desc)
      appendTable($element, node)
      this.appendChildNodeOfType(
        $element,
        node,
        node.type.schema.nodes.table_element_footer
      )
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, $element)
      }
      return $element
    }
    const processExecutableNode = (node: ManuscriptNode, $element: Element) => {
      const listingNode = this.getFirstChildOfType(schema.nodes.listing, node)

      if (listingNode) {
        const { contents, languageKey } = listingNode.attrs

        if (contents && languageKey) {
          const $listing = this.createElement('fig')
          $listing.setAttribute('specific-use', 'source')
          $element.appendChild($listing)

          const $code = this.createElement('code')
          $code.setAttribute('executable', 'true')
          $code.setAttribute('language', languageKey)
          $code.textContent = contents
          $listing.appendChild($code)
        }
      }
    }
  }

  private createEquation(node: ManuscriptNode, isInline = false) {
    if (node.attrs.format === 'tex') {
      const $texMath = this.createElement('tex-math')
      $texMath.setAttribute('notation', 'LaTeX')
      $texMath.setAttribute('version', 'MathJax')
      if (node.attrs.contents.includes('<![CDATA[')) {
        $texMath.innerHTML = node.attrs.contents
      } else {
        $texMath.innerHTML = `<![CDATA[ ${node.attrs.contents} ]]>`
      }
      return $texMath
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

  private buildContributorGroup = (contributors: ContributorNode[]) => {
    if (!contributors.length) {
      return
    }

    const affiliationIDs = contributors.flatMap((n) => n.attrs.affiliationIDs)
    const affiliationOrder = new Map<string, number>()
    affiliationIDs.forEach((id, index) => {
      if (!affiliationOrder.has(id)) {
        affiliationOrder.set(id, index)
      }
    })

    const affiliations = this.getChildrenOfType<AffiliationNode>(
      schema.nodes.affiliation
    )
      .filter((a) => affiliationIDs.includes(a.attrs.id))
      .sort(
        (a, b) =>
          (affiliationOrder.get(a.attrs.id) ?? Infinity) -
          (affiliationOrder.get(b.attrs.id) ?? Infinity)
      )

    const $contribGroup = this.createElement('contrib-group')
    $contribGroup.setAttribute('content-type', 'authors')
    contributors.forEach((contributor) => {
      $contribGroup.appendChild(this.serializeNode(contributor))
    })
    affiliations.forEach((affiliation) => {
      $contribGroup.appendChild(this.serializeNode(affiliation))
    })
    return $contribGroup
  }

  private buildAuthorNotes = () => {
    const authorNotes = this.getFirstChildOfType<AuthorNotesNode>(
      schema.nodes.author_notes
    )
    const $authorNotes = this.createElement('author-notes')
    if (authorNotes) {
      this.appendAuthorNotes($authorNotes, authorNotes)
    }

    return $authorNotes.hasChildNodes() ? $authorNotes : undefined
  }

  private moveCoiStatementToAuthorNotes = (
    $back: HTMLElement,
    $front: HTMLElement
  ) => {
    const $articleMeta = $front.querySelector('article-meta')
    if (!$articleMeta) {
      return
    }

    $back.querySelectorAll('fn-group').forEach(($fnGroup) => {
      const $coiStatement = $fnGroup.querySelector(
        'fn[fn-type="coi-statement"]'
      )
      if (!$coiStatement) {
        return
      }

      const $existingAuthorNotes = $articleMeta.querySelector('author-notes')
      if ($existingAuthorNotes) {
        $existingAuthorNotes.append($coiStatement)
      } else {
        const $authorNotes = this.createElement('author-notes')
        $authorNotes.append($coiStatement)
        const appendableSelectors = [
          'contrib-group',
          'title-group',
          'article-id',
        ]
        const appendable = [
          ...$articleMeta.querySelectorAll(appendableSelectors.join(', ')),
        ]
        for (const selector of appendableSelectors) {
          const match = appendable.find((el) => el.matches(selector))
          if (match) {
            $articleMeta.insertBefore($authorNotes, match.nextSibling)
            break
          }
        }
      }

      if (!$fnGroup.hasChildNodes()) {
        $fnGroup.remove()
      }
    })
  }

  private computeContributorLabels = (contributors: ContributorNode[]) => {
    const labels = new Map<string, number>()
    const assign = (id: string) => {
      if (!labels.has(id)) {
        labels.set(id, labels.size + 1)
      }
    }
    contributors.forEach((contributor) => {
      contributor.attrs.affiliationIDs?.forEach(assign)
      contributor.attrs.footnoteIDs?.forEach(assign)
      contributor.attrs.correspIDs?.forEach(assign)
    })
    return labels
  }

  private createLabelSup = (id: string) => {
    const $sup = this.createElement('sup')
    $sup.textContent = String(this.contributorLabels.get(id))
    return $sup
  }

  private buildContributorElement = (contributor: ContributorNode) => {
    const $contrib = this.createElement('contrib')
    $contrib.setAttribute('contrib-type', 'author')
    $contrib.setAttribute('id', normalizeID(contributor.attrs.id))

    if (contributor.attrs.isCorresponding) {
      $contrib.setAttribute('corresp', 'yes')
    }

    if (contributor.attrs.role) {
      this.appendElement($contrib, 'role', contributor.attrs.role)
    }

    if (contributor.attrs.ORCID) {
      const contribIdAttrs: Record<string, string> = {
        'contrib-id-type': 'orcid',
      }
      if (contributor.attrs.isAuthenticated) {
        contribIdAttrs['authenticated'] = 'true'
      }
      this.appendElement(
        $contrib,
        'contrib-id',
        contributor.attrs.ORCID,
        contribIdAttrs
      )
    }

    const $name = this.buildContributorName(contributor)
    $contrib.appendChild($name)

    if (contributor.attrs.suffix) {
      this.appendElement($name, 'suffix', contributor.attrs.suffix)
    }

    contributor.attrs.degrees?.forEach((degree) => {
      this.appendElement($contrib, 'degrees', degree)
    })

    if (contributor.attrs.email) {
      this.appendElement($contrib, 'email', contributor.attrs.email)
    }

    contributor.attrs.affiliationIDs?.forEach((rid) => {
      const $xref = this.appendElement($contrib, 'xref', '', {
        'ref-type': 'aff',
        rid: normalizeID(rid),
      })
      $xref.appendChild(this.createLabelSup(rid))
    })

    contributor.attrs.footnoteIDs?.forEach((rid) => {
      const $xref = this.appendElement($contrib, 'xref', '', {
        'ref-type': 'fn',
        rid: normalizeID(rid),
      })
      $xref.appendChild(this.createLabelSup(rid))
    })

    contributor.attrs.correspIDs?.forEach((rid) => {
      const $xref = this.appendElement($contrib, 'xref', '', {
        'ref-type': 'corresp',
        rid: normalizeID(rid),
      })
      $xref.appendChild(this.createLabelSup(rid))
    })

    contributor.attrs.creditRoles?.forEach((credit) => {
      const url = CreditRoleUrls.get(credit.vocabTerm)
      if (!url) {
        return
      }
      this.appendElement($contrib, 'role', credit.vocabTerm, {
        'vocab-identifier': 'http://credit.niso.org/',
        vocab: 'CRediT',
        'vocab-term': credit.vocabTerm,
        'vocab-term-identifier': url,
      })
    })

    return $contrib
  }

  private buildAffiliationElement = (affiliation: AffiliationNode) => {
    const $content: HTMLElement[] = []

    if (affiliation.attrs.department) {
      $content.push(
        this.createElement('institution', affiliation.attrs.department, {
          'content-type': 'dept',
        })
      )
    }

    if (affiliation.attrs.institution) {
      $content.push(
        this.createElement('institution', affiliation.attrs.institution)
      )
    }

    if (affiliation.attrs.addressLine1) {
      $content.push(
        this.createElement('addr-line', affiliation.attrs.addressLine1)
      )
    }

    if (affiliation.attrs.addressLine2) {
      $content.push(
        this.createElement('addr-line', affiliation.attrs.addressLine2)
      )
    }

    if (affiliation.attrs.addressLine3) {
      $content.push(
        this.createElement('addr-line', affiliation.attrs.addressLine3)
      )
    }

    if (affiliation.attrs.city) {
      $content.push(this.createElement('city', affiliation.attrs.city))
    }

    if (affiliation.attrs.county) {
      $content.push(this.createElement('state', affiliation.attrs.county))
    }

    if (affiliation.attrs.country) {
      $content.push(this.createElement('country', affiliation.attrs.country))
    }

    if (affiliation.attrs.postCode) {
      $content.push(
        this.createElement('postal-code', affiliation.attrs.postCode)
      )
    }

    const $aff = this.createElement('aff')
    $aff.setAttribute('id', normalizeID(affiliation.attrs.id))

    const label = this.contributorLabels.get(affiliation.attrs.id)
    if (label) {
      this.appendElement($aff, 'label', String(label))
    }

    $content.forEach((node, i) => {
      if (i > 0) {
        $aff.appendChild(this.document.createTextNode(', '))
      }
      $aff.appendChild(node)
    })

    return $aff
  }

  private buildContributorName = (contributor: ContributorNode) => {
    const { given, family } = contributor.attrs
    if (Boolean(given) !== Boolean(family)) {
      return this.createElement('string-name', given || family)
    }

    const $name = this.createElement('name')

    if (contributor.attrs.family) {
      this.appendElement($name, 'surname', contributor.attrs.family)
    }

    if (contributor.attrs.given) {
      this.appendElement($name, 'given-names', contributor.attrs.given)
    }

    if (contributor.attrs.prefix) {
      this.appendElement($name, 'prefix', contributor.attrs.prefix)
    }

    return $name
  }

  private writeCorresp = (corresp: CorrespNode) => {
    const $corresp = this.createElement('corresp')
    $corresp.setAttribute('id', normalizeID(corresp.attrs.id))
    if (corresp.attrs.label) {
      this.appendElement($corresp, 'label', corresp.attrs.label)
    }
    $corresp.append(corresp.textContent)
    return $corresp
  }

  private writeParagraph = (paragraph: ParagraphNode) => {
    const dom = new DOMParser().parseFromString(
      paragraph.textContent,
      'text/html'
    )
    const $p = this.createElement('p')
    $p.setAttribute('id', normalizeID(paragraph.attrs.id))
    if (dom.body.innerHTML.length) {
      $p.innerHTML = dom.body.innerHTML
    }
    return $p
  }

  private writeFootnote = (footnote: FootnoteNode) => {
    const $fn = this.createElement('fn')
    $fn.setAttribute('id', normalizeID(footnote.attrs.id))
    let content = footnote.textContent
    if (!content.includes('<p>')) {
      content = `<p>${content}</p>`
    }
    $fn.innerHTML = content
    return $fn
  }

  private appendAuthorNotes = (
    $authorNotes: HTMLElement,
    authorNotes: AuthorNotesNode
  ) => {
    const correspIDs = new Set(
      this.getChildrenOfType<ContributorNode>(schema.nodes.contributor).flatMap(
        (contributor) => contributor.attrs.correspIDs
      )
    )
    authorNotes.descendants((node) => {
      switch (node.type) {
        case schema.nodes.paragraph: {
          $authorNotes.append(this.writeParagraph(node as ParagraphNode))
          break
        }
        case schema.nodes.footnote: {
          $authorNotes.append(this.writeFootnote(node as FootnoteNode))
          break
        }
        case schema.nodes.corresp: {
          if (correspIDs.has(node.attrs.id)) {
            $authorNotes.append(this.writeCorresp(node as CorrespNode))
          }
          break
        }
      }
      return false
    })
  }

  private serializeAuthorNotes = (authorNotes: AuthorNotesNode) => {
    const $authorNotes = this.createElement('author-notes')
    this.appendAuthorNotes($authorNotes, authorNotes)
    return $authorNotes.hasChildNodes() ? $authorNotes : ''
  }

  private buildKeywords = (): Node[] =>
    this.getChildrenOfType(schema.nodes.keyword_group).map((group) =>
      this.serializeNode(group)
    )

  private changeTag = (node: Element, tag: string) => {
    const $clone = this.createElement(tag)
    for (const attr of node.attributes) {
      $clone.setAttributeNS(null, attr.name, attr.value)
    }
    while (node.firstChild) {
      $clone.appendChild(node.firstChild)
    }
    node.replaceWith($clone)
    return $clone
  }

  private normalizeTable = (table: Node) => {
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
    const $thead = this.createElement('thead')

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
          $thead.appendChild(row)
        }
      }
    })

    if ($thead.hasChildNodes()) {
      table.insertBefore($thead, tbody as Element)
    }
  }

  private buildAbstracts = (): Element[] => {
    const abstracts: Element[] = []
    const abstractsNode = this.getFirstChildOfType(schema.nodes.abstracts)
    abstractsNode?.forEach((child) => {
      const $abstract = this.serializeNode(child) as Element
      if ($abstract.nodeName === 'abstract') {
        $abstract
          .querySelectorAll(':scope > title')
          .forEach((title) => title.remove())
      }
      abstracts.push($abstract)
    })
    return abstracts
  }

  private sectionToAcknowledgement = ($section: Element) => {
    const $acknowledgement = this.createElement('ack')
    $acknowledgement.append(...$section.childNodes)
    return $acknowledgement
  }

  sectionToFootnote = (section: Element, fnType: string) => {
    const $footNote = this.createElement('fn')
    $footNote.setAttribute('fn-type', fnType)
    const $title = section.querySelector('title')
    if ($title) {
      const $footNoteTitle = this.createElement('label')
      $footNoteTitle.textContent = $title.textContent
      section.removeChild($title)
      $footNote.append($footNoteTitle)
    }
    $footNote.append(...section.children)
    if (section.parentNode) {
      section.parentNode.removeChild(section)
    }
    return $footNote
  }
  private buildFloatsGroup = () => {
    const heroImage = this.getFirstChildOfType(schema.nodes.hero_image)
    if (!heroImage) {
      return
    }
    const $floatsGroup = this.createElement('floats-group')
    let $figure: HTMLElement | null = null
    heroImage.descendants((node) => {
      if (node.type === schema.nodes.figure) {
        $figure = this.serializeNode(node) as HTMLElement
        $floatsGroup.appendChild($figure)
      } else {
        const $serializedNode = this.serializeNode(node)
        $figure?.appendChild($serializedNode)
      }
      return false
    })

    if ($floatsGroup.children.length > 0) {
      return $floatsGroup
    }
  }

  private fillEmptyElements(
    articleElement: Element,
    selector: string,
    tagName = 'p'
  ) {
    const emptyElements = Array.from(
      articleElement.querySelectorAll(selector)
    ).filter(($element) => !$element.innerHTML)
    emptyElements.forEach(($element) =>
      $element.appendChild(this.createElement(tagName))
    )
  }
  private addParagraphsToSections(articleElement: Element) {
    const $sections = articleElement.querySelectorAll('sec, abstract')
    const TITLE_TAGS = new Set(['title', 'label', 'sec-meta'])
    for (const section of $sections) {
      const hasContent = Array.from(section.children).some(
        (child) => !TITLE_TAGS.has(child.tagName)
      )
      if (hasContent) {
        continue
      }
      const $p = this.createElement('p')
      const insertAfterElement =
        section.querySelector(':scope > title') ??
        section.querySelector(':scope > label') ??
        section.querySelector(':scope > sec-meta')

      if (insertAfterElement) {
        insertAfterElement.insertAdjacentElement('afterend', $p)
      } else {
        section.prepend($p)
      }
    }
  }

  private fillEmptyFootnotes(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'fn')
  }

  private fillEmptyTableFooters(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'table-wrap-foot')
  }

  private fillEmptyListItem(articleElement: Element) {
    this.fillEmptyElements(articleElement, 'list-item')
  }
}
