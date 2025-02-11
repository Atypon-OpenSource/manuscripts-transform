/*!
 * © 2025 Atypon Systems LLC
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
  buildBibliographicDate,
  buildBibliographicName,
} from '@manuscripts/json-schema'
import { DOMParser, Fragment } from 'prosemirror-model'

import { trimTextContent } from '../../../lib/utils'
import {
  BibliographyItemAttrs,
  ManuscriptNode,
  MarkRule,
  NodeRule,
  schema,
  SectionCategory,
} from '../../../schema'
import { getHTMLContent } from '../jats-parser-utils'
export abstract class JatsParser {
  protected readonly doc: Document
  protected readonly schema = schema
  protected parser: DOMParser
  protected static readonly XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
  protected readonly sectionCategories: SectionCategory[]
  abstract parse(): ManuscriptNode | undefined

  constructor(doc: Document, sectionCategories?: SectionCategory[]) {
    this.doc = doc
    this.sectionCategories = sectionCategories || []
    this.initParser()
  }
  protected createElement = (tag: string) => this.doc.createElement(tag)
  protected initParser() {
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }
  protected get nodes(): NodeRule[] {
    return []
  }

  protected get allNodes(): NodeRule[] {
    return this.nodes.concat(this.commonNodes)
  }

  protected static parsePriority(priority: string | null) {
    if (!priority) {
      return undefined
    }
    return parseInt(priority)
  }
  private static chooseBibliographyItemType = (
    publicationType: string | null
  ) => {
    switch (publicationType) {
      case 'book':
      case 'thesis':
        return publicationType
      case 'journal':
      default:
        return 'article-journal'
    }
  }
  private static parseRef = (element: Element) => {
    const publicationType = element.getAttribute('publication-type')

    const authorNodes = [
      ...element.querySelectorAll(
        'person-group[person-group-type="author"] > *'
      ),
    ]

    const id = element.id

    const attrs: BibliographyItemAttrs = {
      id,
      type: JatsParser.chooseBibliographyItemType(publicationType),
    }
    const title = getHTMLContent(element, 'article-title')
    if (title) {
      attrs.title = title
    }

    const mixedCitation = element.querySelector('mixed-citation')

    if (authorNodes.length <= 0) {
      mixedCitation?.childNodes.forEach((item) => {
        if (
          item.nodeType === Node.TEXT_NODE &&
          item.textContent?.match(/[A-Za-z]+/g)
        ) {
          attrs.literal = trimTextContent(mixedCitation) ?? ''
          return attrs
        }
      })
    }

    const source = getHTMLContent(element, 'source')
    if (source) {
      attrs.containerTitle = source
    }

    const volume = trimTextContent(element, 'volume')
    if (volume) {
      attrs.volume = volume
    }

    const issue = trimTextContent(element, 'issue')
    if (issue) {
      attrs.issue = issue
    }

    const supplement = trimTextContent(element, 'supplement')
    if (supplement) {
      attrs.supplement = supplement
    }

    const fpage = trimTextContent(element, 'fpage')
    const lpage = trimTextContent(element, 'lpage')
    if (fpage) {
      attrs.page = lpage ? `${fpage}-${lpage}` : fpage
    }

    const year = trimTextContent(element, 'year')
    if (year) {
      attrs.issued = buildBibliographicDate({
        'date-parts': [[year]],
      })
    }

    const doi = trimTextContent(element, 'pub-id[pub-id-type="doi"]')
    if (doi) {
      attrs.doi = doi
    }

    const authors: BibliographicName[] = []
    authorNodes.forEach((authorNode) => {
      const name = buildBibliographicName({})
      const given = trimTextContent(authorNode, 'given-names')
      if (given) {
        name.given = given
      }
      const family = trimTextContent(authorNode, 'surname')

      if (family) {
        name.family = family
      }

      if (authorNode.nodeName === 'collab') {
        name.literal = trimTextContent(authorNode)
      }
      authors.push(name)
    })

    if (authors.length) {
      attrs.author = authors
    }
    return attrs
  }
  private static getFigureAttrs = (node: HTMLElement | string | Node) => {
    const element = node as HTMLElement
    const parentElement = element.parentElement
    return {
      id: element.getAttribute('id'),
      type:
        parentElement?.getAttribute('fig-type') ??
        element.getAttribute('content-type') ??
        '',
      src: element.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'href'),
    }
  }
  private static isMatchingCategory(
    secType: string | null,
    titleNode: Element | null,
    category: SectionCategory
  ) {
    if (secType && category.synonyms.includes(secType)) {
      return true
    }
    if (titleNode && titleNode.nodeName === 'title' && titleNode.textContent) {
      const textContent = titleNode.textContent.trim().toLowerCase()
      if (category.synonyms.includes(textContent)) {
        return true
      }
    }
    return false
  }
  protected chooseSectionCategory(section: HTMLElement) {
    const secType = section.getAttribute('sec-type')
    const titleNode = section.firstElementChild

    for (const category of this.sectionCategories) {
      if (JatsParser.isMatchingCategory(secType, titleNode, category)) {
        return category.id
      }
    }
  }
  private static getEquationContent = (p: string | HTMLElement) => {
    const element = p as HTMLElement
    const id = element.getAttribute('id')
    const container = element.querySelector('alternatives') ?? element
    let contents: string | null = ''
    let format: string | null = ''
    for (const child of container.childNodes) {
      const nodeName = child.nodeName.replace(/^[a-z]:/, '')

      switch (nodeName) {
        case 'tex-math':
          contents = child.textContent
          format = 'tex'
          break
        case 'mml:math':
          contents = (child as Element).outerHTML
          format = 'mathml'
          break
      }
    }
    return { id, format, contents }
  }
  private get commonNodes(): NodeRule[] {
    return [
      {
        tag: 'highlight-marker',
        node: 'highlight_marker',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.id,
            position: element.getAttribute('position'),
          }
        },
      },
      {
        tag: 'attrib',
        node: 'attribution',
      },
      {
        tag: 'history',
        ignore: true,
      },
      {
        tag: 'break',
        node: 'hard_break',
      },
      {
        tag: 'caption',
        node: 'figcaption',
        context: 'figure/',
      },
      {
        tag: 'caption',
        node: 'figcaption',
        context: 'figure_element/|table_element/|embed/',
        getContent: (node, schema) => {
          const element = node as HTMLElement

          const content = []

          const title = element.querySelector('title')
          if (title) {
            const captionTitle = schema.nodes.caption_title.create()
            content.push(this.parser.parse(title, { topNode: captionTitle }))
          }

          const paragraphs = element.querySelectorAll('p')
          if (paragraphs.length) {
            const figcaption = schema.nodes.caption.create()
            for (const paragraph of paragraphs) {
              content.push(
                this.parser.parse(paragraph, { topNode: figcaption })
              )
            }
          }

          return Fragment.from(content) as Fragment
        },
      },
      {
        tag: 'caption',
        node: 'figcaption',
        context: 'box_element/',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'code',
        node: 'listing',
        context: 'listing_element/',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            language: element.getAttribute('language') ?? '',
            contents: trimTextContent(element),
          }
        },
      },
      {
        tag: 'inline-formula',
        node: 'inline_equation',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return JatsParser.getEquationContent(element)
        },
      },
      {
        tag: 'disp-formula',
        node: 'equation_element',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
          }
        },
        getContent: (node, schema) => {
          const element = node as HTMLElement
          const attrs = JatsParser.getEquationContent(element)
          return Fragment.from([
            schema.nodes.equation.createChecked({ ...attrs }),
          ]) as Fragment
        },
      },
      {
        tag: 'disp-quote[content-type=quote]',
        node: 'blockquote_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'disp-quote[content-type=pullquote]',
        node: 'pullquote_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'ext-link',
        node: 'link',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            href:
              element.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'href') || '',
            title:
              element.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'title') || '',
          }
        },
      },
      {
        tag: 'fig[fig-type=equation]',
        node: 'equation_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'fig[fig-type=listing]',
        node: 'listing_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'graphic[specific-use=MISSING]',
        node: 'missing_figure',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'graphic',
        node: 'figure',
        context: 'figure_element/',
        getAttrs: JatsParser.getFigureAttrs,
      },
      {
        tag: 'graphic',
        node: 'image_element',
        getContent: (node: Node) => {
          const figure = this.schema.nodes.figure.create(
            JatsParser.getFigureAttrs(node)
          )
          return Fragment.from(figure)
        },
      },
      {
        tag: 'fig',
        node: 'figure_element',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const attrib = element.querySelector('attrib')

          const attribution = attrib
            ? {
                literal: trimTextContent(attrib) ?? '',
              }
            : undefined

          return {
            id: element.getAttribute('id'),
            attribution,
          }
        },
      },
      {
        tag: 'fn-group',
        node: 'footnotes_element',
        context: 'footnotes_section/|table_element_footer/',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            kind: 'footnote', // TODO: 'endnote' depending on position or attribute?
          }
        },
      },
      {
        tag: 'table-wrap-foot',
        node: 'table_element_footer',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'general-table-footnote',
        node: 'general_table_footnote',
        context: 'table_element_footer/',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
          }
        },
        getContent: (node) => {
          const paragraphs: ManuscriptNode[] = []
          node.childNodes.forEach((p) => {
            const paragraph = this.schema.nodes.paragraph.create()
            const content = this.parser.parse(p, {
              topNode: paragraph,
            })
            paragraphs.push(content)
          })
          return Fragment.from([...paragraphs]) as Fragment
        },
      },
      {
        tag: 'fn',
        node: 'footnote',
        context: 'footnotes_element/|table_element_footer/',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            kind: 'footnote', // TODO: 'endnote' depending on position or attribute?
          }
        },
      },
      {
        tag: 'front',
        ignore: true,
      },
      {
        tag: 'list',
        node: 'list',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            listStyleType: element.getAttribute('list-type'),
          }
        },
      },
      {
        tag: 'list-item',
        node: 'list_item',
      },
      {
        tag: 'p',
        node: 'paragraph',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'media',
        node: 'embed',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
            href: element.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'href'),
            mimetype: element.getAttribute('mimetype'),
            mimeSubtype: element.getAttribute('mime-subtype'),
          }
        },
      },
      {
        tag: 'sec[sec-type="box-element"]',
        node: 'box_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'sec[sec-type="bibliography"]',
        node: 'bibliography_section',
      },
      {
        tag: 'ref-list',
        context: 'bibliography_section/',
        node: 'bibliography_element',
      },
      {
        tag: 'ref',
        context: 'bibliography_element/',
        node: 'bibliography_item',
        getAttrs: (node) => JatsParser.parseRef(node as Element),
      },
      {
        tag: 'sec',
        node: 'section',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
            category: this.chooseSectionCategory(element),
          }
        },
      },
      {
        tag: 'boxed-text',
        ignore: true,
      },
      {
        tag: 'label',
        context: 'section/',
        node: 'section_label',
      },
      {
        tag: 'table',
        node: 'table',
        // TODO: count thead and tfoot rows
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'table-wrap',
        node: 'table_element',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
          }
        },
      },
      {
        tag: 'title',
        node: 'section_title',
        context:
          'section/|footnotes_section/|bibliography_section/|keywords/|supplements/|author_notes/|graphical_abstract_section/',
      },
      {
        tag: 'title',
        node: 'caption_title',
        context: 'figcaption/',
      },
      {
        tag: 'tr',
        node: 'table_row',
      },
      {
        tag: 'td',
        node: 'table_cell',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const colspan = parseInt(element.getAttribute('colspan') || '1')
          const rowspan = parseInt(element.getAttribute('rowspan') || '1')
          return {
            ...(colspan && { colspan }),
            ...(rowspan && { rowspan }),
            valign: element.getAttribute('valign'),
            align: element.getAttribute('align'),
            scope: element.getAttribute('scope'),
            style: element.getAttribute('style'),
          }
        },
      },
      {
        tag: 'th',
        node: 'table_header',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const colspan = parseInt(element.getAttribute('colspan') || '1')
          const rowspan = parseInt(element.getAttribute('rowspan') || '1')
          return {
            ...(colspan && { colspan }),
            ...(rowspan && { rowspan }),
            valign: element.getAttribute('valign'),
            align: element.getAttribute('align'),
            scope: element.getAttribute('scope'),
            style: element.getAttribute('style'),
          }
        },
      },
      {
        tag: 'col',
        node: 'table_col',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            width: element.getAttribute('width'),
          }
        },
      },
      {
        tag: 'colgroup',
        node: 'table_colgroup',
      },
      {
        tag: 'xref[ref-type="bibr"]',
        node: 'citation',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            rids: element.getAttribute('rid')?.split(/\s+/) || [],
            contents: trimTextContent(element),
          }
        },
      },
      {
        tag: 'xref[ref-type="fn"]',
        node: 'inline_footnote',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            rids: element.getAttribute('rid')?.split(/\s+/) || [],
          }
        },
      },
      {
        tag: 'xref',
        node: 'cross_reference',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            rids: element.getAttribute('rid')?.split(/\s+/) || [],
          }
        },
      },
      {
        tag: 'label',
        ignore: true,
      },
    ]
  }
  protected get marks(): MarkRule[] {
    return [
      {
        tag: 'bold',
        mark: 'bold',
      },
      {
        tag: 'code',
        mark: 'code',
      },
      {
        tag: 'italic',
        mark: 'italic',
      },
      {
        tag: 'sc',
        mark: 'smallcaps',
      },
      {
        tag: 'strike',
        mark: 'strikethrough',
      },
      {
        tag: 'styled-content',
        mark: 'styled',
        getAttrs: (node) => ({
          style: (node as Element).getAttribute('style'),
        }),
      },
      {
        tag: 'sub',
        mark: 'subscript',
      },
      {
        tag: 'sup',
        mark: 'superscript',
      },
      {
        tag: 'underline',
        mark: 'underline',
      },
    ]
  }
}
