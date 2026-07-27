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
  isBibliographyItemNode,
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
} from '../../schema'
import { isExecutableNodeType } from '../../transformer'
import { IdGenerator } from '../types'
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

const normalizeId = (id: string) => id.replace(/:/g, '_')

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

const createDefaultIdGenerator = (): IdGenerator => {
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

    const $article = this.document.documentElement

    $article.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      XLINK_NAMESPACE
    )
    this.labelTargets = buildTargets(
      manuscriptNode.descendants.bind(manuscriptNode)
    )
    this.footnoteLabels = generateFootnoteLabels(manuscriptNode)

    const $body = this.buildBody()
    const $back = this.buildBack()
    this.routeBackmatterSections($body, $back)
    const $coiStatement = this.extractCoiStatement($back)
    $back.appendChild(this.buildRefList())

    const $front = this.buildFront($coiStatement)
    $article.appendChild($front)
    $article.setAttribute(
      'article-type',
      manuscriptNode.attrs.articleType || 'other'
    )
    $article.setAttributeNS(
      XML_NAMESPACE,
      'lang',
      manuscriptNode.attrs.primaryLanguageCode || 'en'
    )
    $article.appendChild($body)
    $article.appendChild($back)
    this.addParagraphsToSections($article)
    this.fillEmptyTableFooters($article)
    this.fillEmptyFootnotes($article)
    this.fillEmptyListItem($article)
    const $floatsGroup = this.buildFloatsGroup()
    if ($floatsGroup) {
      $article.appendChild($floatsGroup)
    }
    await this.rewriteIds()
    return serializeToXML(this.document)
  }

  private appendChildNodeOfType = (
    $element: Element,
    node: ManuscriptNode,
    type: ManuscriptNodeType
  ) => {
    const childNode = this.getFirstChildOfType(type, node)
    if (childNode) {
      $element.appendChild(this.serializeNode(childNode))
    }
  }

  private appendChildrenNodeOfType = (
    $element: Element,
    node: ManuscriptNode,
    type: ManuscriptNodeType
  ) => {
    const children = this.getChildrenOfType(type, node)
    children.map((childNode) =>
      $element.appendChild(this.serializeNode(childNode))
    )
  }

  protected appendCaption = ($element: Element, node: ManuscriptNode) => {
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
    const citedItemIds: Set<string> = new Set()

    this.manuscriptNode.descendants((n) => {
      if (isBibliographyItemNode(n)) {
        bibitems.set(n.attrs.id, n.attrs as CSL.Data)
      }
      if (isCitationNode(n)) {
        citations.set(n.attrs.id, buildCiteprocCitation(n.attrs))
        n.attrs.rids.forEach((rid: string) => citedItemIds.add(rid))
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

    const uncitedItemIds = [...bibitems.keys()].filter(
      (id) => !citedItemIds.has(id)
    )

    const output = engine.rebuildProcessorState(
      [...citations.values()],
      undefined,
      uncitedItemIds
    )

    this.engine = engine
    this.renderedCitations = new Map(output.map((i) => [i[0], i[2]]))
  }

  private nodeFromJATS = (fragment: string) => {
    fragment = fragment.trim().replace('&nbsp;', ' ')
    if (!fragment.length) {
      return null
    }
    const $template = this.createElement('template')
    $template.innerHTML = fragment
    return $template.firstChild
  }

  protected rewriteIds = async (
    generator: IdGenerator = createDefaultIdGenerator()
  ) => {
    const ids = new Map<string, string | null>()

    for (const $element of this.document.querySelectorAll('[id]')) {
      const oldId = $element.getAttribute('id')
      const newId = await generator($element)
      if (newId) {
        $element.setAttribute('id', newId)
      } else {
        $element.removeAttribute('id')
      }
      if (oldId) {
        ids.set(oldId, newId)
      }
    }

    for (const $node of this.document.querySelectorAll('[rid]')) {
      const rids = $node.getAttribute('rid')

      if (rids) {
        const newRids = rids
          .split(/\s+/)
          .filter(Boolean)
          .map((rid) => ids.get(rid))
          .filter(Boolean)

        if (newRids.length) {
          $node.setAttribute('rid', newRids.join(' '))
        }
      }
    }
  }

  protected buildFront = ($coiStatement?: Element) => {
    const $front = this.createElement('front')
    const $articleMeta = this.createElement('article-meta')
    $front.appendChild($articleMeta)

    const contributors = this.getChildrenOfType<ContributorNode>(
      schema.nodes.contributor
    ).sort((a, b) => Number(a.attrs.priority) - Number(b.attrs.priority))
    this.contributorLabels = this.computeContributorLabels(contributors)
    const $frontNodes = [
      this.buildArticleId(),
      this.buildTitleGroup(),
      this.buildContributorGroup(contributors),
      this.buildAuthorNotes($coiStatement),
      this.buildSupplements(),
      this.buildHistory(),
      this.buildSelfUris(),
      this.buildAbstracts(),
      this.buildKeywords(),
      this.buildAwards(),
      this.buildCounts(),
    ]

    $frontNodes.forEach(($nodes) => this.appendChildren($articleMeta, $nodes))
    return $front
  }

  private appendChildren = (
    $parent: Element,
    $elements?: Node | Node[] | null
  ) => {
    if (!$elements) {
      return
    }
    const list = Array.isArray($elements) ? $elements : [$elements]
    list.forEach(($element) => $parent.appendChild($element))
  }

  private buildArticleId = (): Element | undefined => {
    if (this.manuscriptNode.attrs.doi) {
      const $articleId = this.createElement('article-id')
      $articleId.setAttribute('pub-id-type', 'doi')
      $articleId.textContent = this.manuscriptNode.attrs.doi
      return $articleId
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

  private buildSupplements = () =>
    this.getChildrenOfType(schema.nodes.supplement).map((node) =>
      this.serializeNode(node)
    )

  private buildHistory = () => {
    const $history = this.createElement('history')
    const dates = new Map([
      ['accepted', this.manuscriptNode.attrs.acceptanceDate],
      ['corrected', this.manuscriptNode.attrs.correctionDate],
      ['retracted', this.manuscriptNode.attrs.retractionDate],
      ['received', this.manuscriptNode.attrs.receiveDate],
      ['rev-recd', this.manuscriptNode.attrs.revisionReceiveDate],
      ['rev-request', this.manuscriptNode.attrs.revisionRequestDate],
    ])

    dates.forEach((val, key) => {
      if (val) {
        $history.appendChild(this.buildDateElement(val, key))
      }
    })

    if ($history.childElementCount) {
      return $history
    }
  }

  private buildCounts = () => {
    const $counts = this.createElement('counts')
    const counts = new Map([
      ['fig-count', this.getChildrenOfType(schema.nodes.figure).length],
      ['table-count', this.getChildrenOfType(schema.nodes.table).length],
      [
        'equation-count',
        this.getChildrenOfType(schema.nodes.equation_element).length,
      ],
      [
        'ref-count',
        this.getChildrenOfType(schema.nodes.bibliography_item).length,
      ],
      ['word-count', this.manuscriptNode.textContent.split(/\s+/).length],
    ])

    counts.forEach((val, key) => {
      if (val) {
        $counts.appendChild(
          this.createElement(key, undefined, { count: String(val) })
        )
      }
    })

    if ($counts.childElementCount) {
      return $counts
    }
  }

  private buildAwards = () => {
    const awards = this.getFirstChildOfType(schema.nodes.awards)
    if (!awards || !awards.childCount) {
      return
    }
    return this.serializeNode(awards)
  }

  private buildSelfUris = () =>
    this.getChildrenOfType(schema.nodes.attachment).map((attachment) =>
      this.serializeNode(attachment)
    )

  protected buildDateElement = (timestamp: number, type: string) => {
    const $date = this.createElement('date')

    $date.setAttribute('date-type', type)

    const date = new Date(timestamp * 1000) // s => ms
    const lookup = {
      year: date.getUTCFullYear().toString(),
      month: (date.getUTCMonth() + 1).toString().padStart(2, '0'),
      day: date.getUTCDate().toString().padStart(2, '0'),
    }

    for (const [key, value] of Object.entries(lookup).reverse()) {
      const $datePart = this.createElement(key, value)
      $date.appendChild($datePart)
    }

    return $date
  }

  protected buildBody = () => {
    const body = this.getFirstChildOfType(schema.nodes.body)
    const $body = this.createElement('body')
    body?.forEach((node) => {
      $body.appendChild(this.serializeNode(node))
    })
    return $body
  }

  protected buildBack = () => {
    const backmatter = this.getFirstChildOfType(schema.nodes.backmatter)
    const $back = this.createElement('back')
    backmatter?.forEach((node) => {
      $back.appendChild(this.serializeNode(node))
    })
    return $back
  }

  private findSection = (category: string, ...$roots: Element[]) => {
    for (const $root of $roots) {
      const $match = $root.querySelector(`sec[sec-type="${category}"]`)
      if ($match) {
        return $match
      }
    }
  }

  private findSections = (category: string, ...$roots: Element[]) =>
    $roots.flatMap(($root) =>
      Array.from($root.querySelectorAll<Element>(`sec[sec-type="${category}"]`))
    )

  private routeBackmatterSections = ($body: Element, $back: Element) => {
    const $footnoteSections = FOOTNOTE_SECTION_CATEGORY_IDS.flatMap(
      (category) =>
        this.findSections(category, $body, $back).map(($section) => ({
          $section,
          category,
        }))
    )
    let $fnGroup: Element | undefined
    if ($footnoteSections.length) {
      $fnGroup = this.createElement('fn-group')
      for (const { $section, category } of $footnoteSections) {
        $fnGroup.appendChild(this.sectionToFootnote($section, category))
      }
    }

    const $appendices = this.findSections('appendices', $body, $back)
    let $appGroup: Element | undefined
    if ($appendices.length) {
      $appGroup = this.createElement('app-group')
      for (const $section of $appendices) {
        const $app = this.createElement('app')
        $app.appendChild($section)
        $appGroup.appendChild($app)
      }
    }

    const $ackSection = this.findSection('acknowledgements', $body, $back)
    let $ack: Element | undefined
    if ($ackSection) {
      $ack = this.createElement('ack')
      $ack.append(...$ackSection.childNodes)
      $ackSection.remove()
    }

    const $availabilitySection = this.findSection('availability', $body, $back)
    const $ethicsSection = this.findSection('ethics-statement', $body, $back)

    const $prepend = [
      $appGroup,
      $ack,
      $availabilitySection,
      $ethicsSection,
      $fnGroup,
    ].filter((el): el is Element => el != null)

    if ($prepend.length) {
      $back.prepend(...$prepend)
    }
  }

  private extractCoiStatement = ($back: Element) => {
    const $coiStatement = $back.querySelector<Element>(
      'fn[fn-type="coi-statement"]'
    )
    if (!$coiStatement) {
      return undefined
    }

    const $fnGroup = $coiStatement.parentElement
    $coiStatement.remove()

    if ($fnGroup && !$fnGroup.hasChildNodes()) {
      $fnGroup.remove()
    }

    return $coiStatement
  }

  private buildRefList = () => {
    const $refList = this.createElement('ref-list')
    const [, bibliography] = this.engine.makeBibliography()
    const parser = new DOMParser()
    bibliography.forEach((item) => {
      const fragment = `<template xmlns:xlink="${XLINK_NAMESPACE}">${sanitizeXmlString(
        item
      )}</template>`
      const $ref = parser
        .parseFromString(fragment, 'text/xml')
        .querySelector('ref')
      if ($ref) {
        $refList.appendChild($ref)
      }
    })
    return $refList
  }

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
    $parent: Element,
    tag: string,
    content?: string,
    attrs?: Record<string, string | undefined>
  ) => {
    const $element = this.createElement(tag, content, attrs)
    $parent.appendChild($element)
    return $element
  }

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
        const $media = this.createElement('media')
        $media.setAttribute('id', normalizeId(id))
        $media.setAttributeNS(XLINK_NAMESPACE, 'show', 'embed')
        $media.setAttributeNS(XLINK_NAMESPACE, 'href', href)
        if (mimetype) {
          $media.setAttribute('mimetype', node.attrs.mimetype)
        }
        if (mimeSubtype) {
          $media.setAttribute('mime-subtype', node.attrs.mimeSubtype)
        }
        appendLabels($media, node)
        this.appendChildNodeOfType($media, node, schema.nodes.alt_text)
        this.appendChildNodeOfType($media, node, schema.nodes.long_desc)
        this.appendCaption($media, node)
        return $media
      },
      awards: () => ['funding-group', 0],
      award: (node) => {
        const awardGroup = node as AwardNode
        const $awardGroup = this.createElement('award-group')
        $awardGroup.setAttribute('id', normalizeId(awardGroup.attrs.id))
        appendChildIfPresent(
          $awardGroup,
          'funding-source',
          awardGroup.attrs.source
        )
        awardGroup.attrs.code
          ?.split(';')
          .forEach((code) =>
            appendChildIfPresent($awardGroup, 'award-id', code)
          )
        appendChildIfPresent(
          $awardGroup,
          'principal-award-recipient',
          awardGroup.attrs.recipient
        )

        return $awardGroup
      },
      box_element: (node) => createBoxElement(node),
      author_notes: () => '',
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
        $supplementaryMaterial.setAttribute('id', normalizeId(node.attrs.id))
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
        $xref.setAttribute('rid', normalizeId(rids.join(' ')))
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

        $xref.setAttribute('rid', normalizeId(rids.join(' ')))
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
        const $inlineFormula = this.createElement('inline-formula')
        const equation = this.createEquation(node, true)
        $inlineFormula.append(equation)
        return $inlineFormula
      },
      equation_element: (node) => {
        const $dispFormula = this.createElement('disp-formula')
        $dispFormula.setAttribute('id', normalizeId(node.attrs.id))
        appendLabels($dispFormula, node)
        processChildNodes($dispFormula, node, schema.nodes.equation)
        return $dispFormula
      },
      figure: (node) => createGraphic(node),
      figure_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.figure),
      footnote: (node) => {
        const attrs: Attrs = {}

        if (node.attrs.id) {
          attrs.id = normalizeId(node.attrs.id)
        }
        if (node.attrs.category) {
          attrs['fn-type'] = node.attrs.category
        }
        return ['fn', attrs, 0]
      },
      footnotes_element: (node) =>
        node.childCount == 0
          ? ['fn-group', { id: normalizeId(node.attrs.id) }, ['fn', ['p']]]
          : ['fn-group', { id: normalizeId(node.attrs.id) }, 0],
      footnotes_section: (node) => {
        const $fnGroup = this.createElement('fn-group', undefined, {
          id: normalizeId(node.attrs.id),
        })
        const titleNode = this.getFirstChildOfType(
          schema.nodes.section_title,
          node
        )
        if (titleNode) {
          $fnGroup.appendChild(this.serializeNode(titleNode))
        }
        const footnotesNode = this.getFirstChildOfType(
          schema.nodes.footnotes_element,
          node
        )
        if (footnotesNode?.childCount) {
          footnotesNode.forEach((footnote) => {
            $fnGroup.appendChild(this.serializeNode(footnote))
          })
        } else {
          const $fn = this.createElement('fn')
          $fn.appendChild(this.createElement('p'))
          $fnGroup.appendChild($fn)
        }
        return $fnGroup
      },
      hard_break: () => '',
      highlight_marker: () => '',
      inline_footnote: (node) => {
        const rids: string[] = node.attrs.rids
        const $xref = this.createElement('xref')
        $xref.setAttribute('ref-type', 'fn')
        $xref.setAttribute('rid', normalizeId(rids.join(' ')))
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

        const $extLink = this.createElement('ext-link')
        $extLink.setAttribute('ext-link-type', 'uri')
        $extLink.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        $extLink.textContent = text

        if (node.attrs.title) {
          $extLink.setAttributeNS(
            XLINK_NAMESPACE,
            'xlink:title',
            node.attrs.title
          )
        }

        return $extLink
      },
      list_item: () => ['list-item', 0],
      listing: (node) => {
        const $code = this.createElement('code')
        $code.setAttribute('id', normalizeId(node.attrs.id))
        $code.setAttribute('language', node.attrs.languageKey)
        $code.textContent = node.attrs.contents

        return $code
      },
      listing_element: (node) =>
        createFigureElement(node, node.type.schema.nodes.listing),
      manuscript: (node) => ['article', { id: normalizeId(node.attrs.id) }, 0],
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
          attrs.id = normalizeId(node.attrs.id)
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
        const attrs: { [key: string]: string } = {
          id: normalizeId(node.attrs.id),
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
      table: (node) => ['table', { id: normalizeId(node.attrs.id) }, 0],
      table_element: (node) => {
        const $tableWrap = createTableElement(node)
        $tableWrap.setAttribute('position', 'anchor')
        if (node.attrs.type) {
          $tableWrap.setAttribute('content-type', node.attrs.type)
        }
        return $tableWrap
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
      $parent: Element,
      tagName: string,
      textContent: string
    ) => {
      if (!textContent) {
        return
      }
      const $element = this.createElement(tagName)
      $element.textContent = textContent
      $parent.appendChild($element)
    }
    const processChildNodes = (
      $element: Element,
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
      $element.setAttribute('id', normalizeId(node.attrs.id))
      return $element
    }

    const appendLabels = ($element: Element, node: ManuscriptNode) => {
      if (this.labelTargets) {
        const target = this.labelTargets.get(node.attrs.id)

        if (target) {
          const $label = this.createElement('label')
          $label.textContent = target.label
          $element.appendChild($label)
        }
      }
    }
    const appendAttributions = ($element: Element, node: ManuscriptNode) => {
      if (node.attrs.attribution) {
        const $attrib = this.createElement('attrib')
        $attrib.textContent = node.attrs.attribution.literal
        $element.appendChild($attrib)
      }
    }

    const appendTable = ($element: Element, node: ManuscriptNode) => {
      const tableNode = this.getFirstChildOfType(schema.nodes.table, node)
      const colGroupNode = this.getFirstChildOfType(
        schema.nodes.table_colgroup,
        node
      )
      if (!tableNode) {
        return
      }
      const $table = this.serializeNode(tableNode)
      const $tbody = this.createElement('tbody')

      while ($table.firstChild) {
        const $child = $table.firstChild
        $table.removeChild($child)
        $tbody.appendChild($child)
      }
      $table.appendChild($tbody)
      this.normalizeTable($table)
      if (colGroupNode) {
        const $colGroup = this.serializeNode(colGroupNode)
        $table.insertBefore($colGroup, $table.firstChild)
      }

      $element.appendChild($table)
    }
    const createBoxElement = (node: ManuscriptNode) => {
      const $boxedText = createElement(node, 'boxed-text')
      if (node.attrs.type) {
        $boxedText.setAttribute('content-type', node.attrs.type)
      }
      appendLabels($boxedText, node)
      const child = node.firstChild
      if (child?.type === schema.nodes.caption_title) {
        this.appendCaption($boxedText, node)
      }

      processChildNodes($boxedText, node, node.type.schema.nodes.section)
      return $boxedText
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
      targetId: string,
      type: NodeType,
      descend = false
    ) => {
      const nodes = this.getChildrenOfType(type)
      return nodes.some((node) => {
        const result = findChildrenByAttr(
          node,
          (attrs) => attrs.id === targetId,
          descend
        )[0]
        return !!result
      })
    }

    const findParentHeroImage = (targetId: string) => {
      const heroes = this.getChildrenOfType(schema.nodes.hero_image)
      return heroes.find(
        (hero) =>
          !!findChildrenByAttr(hero, (attrs) => attrs.id === targetId)[0]
      )
    }

    const createImage = (node: ManuscriptNode) => {
      const graphicNode = node.content.firstChild
      if (!graphicNode) {
        return ''
      }
      const $graphic = createGraphic(graphicNode)
      if (node.attrs.extLink) {
        const $extLink = this.appendElement($graphic, 'ext-link')
        $extLink.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.extLink)
      }
      this.appendCaption($graphic, node)
      this.appendChildNodeOfType($graphic, node, schema.nodes.alt_text)
      this.appendChildNodeOfType($graphic, node, schema.nodes.long_desc)
      return $graphic
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
      const $fig = createElement(node, 'fig')
      const figNode = this.getFirstChildOfType(schema.nodes.figure, node)
      const figType = figNode?.attrs.type
      if (figType) {
        $fig.setAttribute('fig-type', figType)
      }
      appendLabels($fig, node)
      this.appendCaption($fig, node)
      this.appendChildNodeOfType($fig, node, schema.nodes.alt_text)
      this.appendChildNodeOfType($fig, node, schema.nodes.long_desc)
      this.appendChildNodeOfType(
        $fig,
        node,
        node.type.schema.nodes.footnotes_element
      )
      processChildNodes($fig, node, contentNodeType)
      appendAttributions($fig, node)
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, $fig)
      }
      moveAltTextAndLongDescToGraphics($fig)
      return $fig
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
      const $tableWrap = createElement(node, nodeName)
      appendLabels($tableWrap, node)
      this.appendCaption($tableWrap, node)
      this.appendChildNodeOfType($tableWrap, node, schema.nodes.alt_text)
      this.appendChildNodeOfType($tableWrap, node, schema.nodes.long_desc)
      appendTable($tableWrap, node)
      this.appendChildNodeOfType(
        $tableWrap,
        node,
        node.type.schema.nodes.table_element_footer
      )
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, $tableWrap)
      }
      return $tableWrap
    }
    const processExecutableNode = (node: ManuscriptNode, $element: Element) => {
      const listingNode = this.getFirstChildOfType(schema.nodes.listing, node)

      if (listingNode) {
        const { contents, languageKey } = listingNode.attrs

        if (contents && languageKey) {
          const $fig = this.createElement('fig')
          $fig.setAttribute('specific-use', 'source')
          $element.appendChild($fig)

          const $code = this.createElement('code')
          $code.setAttribute('executable', 'true')
          $code.setAttribute('language', languageKey)
          $code.textContent = contents
          $fig.appendChild($code)
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
      const $mathml = math as Element
      if (!isInline) {
        $mathml.setAttribute('id', normalizeId(node.attrs.id))
      }
      return $mathml
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

    const affiliationIds = contributors.flatMap((n) => n.attrs.affiliationIDs)
    const affiliationOrder = new Map<string, number>()
    affiliationIds.forEach((id, index) => {
      if (!affiliationOrder.has(id)) {
        affiliationOrder.set(id, index)
      }
    })

    const affiliations = this.getChildrenOfType<AffiliationNode>(
      schema.nodes.affiliation
    )
      .filter((a) => affiliationIds.includes(a.attrs.id))
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

  private buildAuthorNotes = ($coiStatement?: Element) => {
    const authorNotes = this.getFirstChildOfType<AuthorNotesNode>(
      schema.nodes.author_notes
    )
    const $authorNotes = this.createElement('author-notes')
    if (authorNotes) {
      this.appendAuthorNotes($authorNotes, authorNotes)
    }
    if ($coiStatement) {
      $authorNotes.appendChild($coiStatement)
    }
    return $authorNotes.hasChildNodes() ? $authorNotes : undefined
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
    $contrib.setAttribute('id', normalizeId(contributor.attrs.id))

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
        rid: normalizeId(rid),
      })
      $xref.appendChild(this.createLabelSup(rid))
    })

    contributor.attrs.footnoteIDs?.forEach((rid) => {
      const $xref = this.appendElement($contrib, 'xref', '', {
        'ref-type': 'fn',
        rid: normalizeId(rid),
      })
      $xref.appendChild(this.createLabelSup(rid))
    })

    contributor.attrs.correspIDs?.forEach((rid) => {
      const $xref = this.appendElement($contrib, 'xref', '', {
        'ref-type': 'corresp',
        rid: normalizeId(rid),
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
    const $content: Element[] = []

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
    $aff.setAttribute('id', normalizeId(affiliation.attrs.id))

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
    $corresp.setAttribute('id', normalizeId(corresp.attrs.id))
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
    $p.setAttribute('id', normalizeId(paragraph.attrs.id))
    if (dom.body.innerHTML.length) {
      $p.innerHTML = dom.body.innerHTML
    }
    return $p
  }

  private writeFootnote = (footnote: FootnoteNode) => {
    const $fn = this.createElement('fn')
    $fn.setAttribute('id', normalizeId(footnote.attrs.id))
    let content = footnote.textContent
    if (!content.includes('<p>')) {
      content = `<p>${content}</p>`
    }
    $fn.innerHTML = content
    return $fn
  }

  private appendAuthorNotes = (
    $authorNotes: Element,
    authorNotes: AuthorNotesNode
  ) => {
    const correspIds = new Set(
      this.getChildrenOfType<ContributorNode>(schema.nodes.contributor).flatMap(
        (contributor) => contributor.attrs.correspIDs
      )
    )
    authorNotes.forEach((node) => {
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
          if (correspIds.has(node.attrs.id)) {
            $authorNotes.append(this.writeCorresp(node as CorrespNode))
          }
          break
        }
      }
    })
  }

  private buildKeywords = (): Node[] =>
    this.getChildrenOfType(schema.nodes.keyword_group).map((group) =>
      this.serializeNode(group)
    )

  private changeTag = ($node: Element, tag: string) => {
    const $clone = this.createElement(tag)
    for (const attr of $node.attributes) {
      $clone.setAttributeNS(null, attr.name, attr.value)
    }
    while ($node.firstChild) {
      $clone.appendChild($node.firstChild)
    }
    $node.replaceWith($clone)
    return $clone
  }

  private normalizeTable = ($table: Node) => {
    let $tbody: Element | undefined

    Array.from($table.childNodes).forEach(($child) => {
      if (
        $child instanceof Element &&
        $child.tagName.toLowerCase() === 'tbody'
      ) {
        $tbody = $child
      }
    })

    if (!$tbody) {
      return
    }

    const tbodyRows = Array.from($tbody.childNodes)
    const $thead = this.createElement('thead')

    tbodyRows.forEach(($row, i) => {
      const isRow =
        $row instanceof Element && $row.tagName.toLowerCase() === 'tr'
      if (isRow) {
        // we assume that <th scope="col | colgroup"> always belongs to <thead>
        const $headerCell = ($row as Element).querySelector(
          'th[scope="col"], th[scope="colgroup"]'
        )
        if (i === 0 || $headerCell) {
          $tbody?.removeChild($row)
          const $tableCells = ($row as Element).querySelectorAll('td')
          for (const $td of $tableCells) {
            // for backwards compatibility since older docs use tds for header cells
            this.changeTag($td, 'th')
          }
          $thead.appendChild($row)
        }
      }
    })

    if ($thead.hasChildNodes()) {
      $table.insertBefore($thead, $tbody as Element)
    }
  }

  private buildAbstracts = () => {
    const $abstracts: Element[] = []
    const abstractsNode = this.getFirstChildOfType(schema.nodes.abstracts)
    abstractsNode?.forEach((child) => {
      const $abstract = this.serializeNode(child) as Element
      if ($abstract.nodeName === 'abstract') {
        $abstract
          .querySelectorAll(':scope > title')
          .forEach((title) => title.remove())
      }
      $abstracts.push($abstract)
    })
    return $abstracts
  }

  sectionToFootnote = ($section: Element, fnType: string) => {
    const $fn = this.createElement('fn')
    $fn.setAttribute('fn-type', fnType)
    const $title = $section.querySelector(':scope > title')
    if ($title) {
      const $label = this.createElement('label')
      $label.textContent = $title.textContent
      $section.removeChild($title)
      $fn.append($label)
    }
    $fn.append(...$section.children)
    if ($section.parentNode) {
      $section.parentNode.removeChild($section)
    }
    return $fn
  }
  private buildFloatsGroup = () => {
    const heroImage = this.getFirstChildOfType(schema.nodes.hero_image)
    if (!heroImage) {
      return
    }
    const $floatsGroup = this.createElement('floats-group')
    let $graphic: Element | null = null
    heroImage.descendants((node) => {
      if (node.type === schema.nodes.figure) {
        $graphic = this.serializeNode(node) as Element
        $floatsGroup.appendChild($graphic)
      } else {
        const $serializedNode = this.serializeNode(node)
        $graphic?.appendChild($serializedNode)
      }
      return false
    })

    if ($floatsGroup.children.length > 0) {
      return $floatsGroup
    }
  }

  private fillEmptyElements(
    $article: Element,
    selector: string,
    tagName = 'p'
  ) {
    const $empty = Array.from($article.querySelectorAll(selector)).filter(
      ($el) => !$el.innerHTML
    )
    $empty.forEach(($element) =>
      $element.appendChild(this.createElement(tagName))
    )
  }
  private addParagraphsToSections($article: Element) {
    const $sections = $article.querySelectorAll('sec, abstract')
    const TITLE_TAGS = new Set(['title', 'label', 'sec-meta'])
    for (const $section of $sections) {
      const hasContent = Array.from($section.children).some(
        ($child) => !TITLE_TAGS.has($child.tagName)
      )
      if (hasContent) {
        continue
      }
      const $p = this.createElement('p')
      const $insertAfter =
        $section.querySelector(':scope > title') ??
        $section.querySelector(':scope > label') ??
        $section.querySelector(':scope > sec-meta')

      if ($insertAfter) {
        $insertAfter.insertAdjacentElement('afterend', $p)
      } else {
        $section.prepend($p)
      }
    }
  }

  private fillEmptyFootnotes($article: Element) {
    this.fillEmptyElements($article, 'fn')
  }

  private fillEmptyTableFooters($article: Element) {
    this.fillEmptyElements($article, 'table-wrap-foot')
  }

  private fillEmptyListItem($article: Element) {
    this.fillEmptyElements($article, 'list-item')
  }
}
