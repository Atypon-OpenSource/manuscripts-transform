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
  buildBibliographicDate,
  buildBibliographicName,
  buildContribution,
  ObjectTypes,
} from '@manuscripts/json-schema'
import { DOMParser, Fragment, ParseOptions, Schema } from 'prosemirror-model'

import {
  dateToTimestamp,
  getCRediTRoleRole,
  getHTMLContent,
  getTrimmedTextContent,
} from '../../lib/utils'
import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  MarkRule,
  NodeRule,
  publicationTypeToPM,
  SectionCategory,
} from '../../schema'
import { DEFAULT_PROFILE_ID } from './jats-comments'

export class JATSDOMParser {
  private XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
  private parser: DOMParser

  constructor(
    private sectionCategories: SectionCategory[],
    private schema: Schema
  ) {
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }

  public parse(doc: Node, options?: ParseOptions) {
    return this.parser.parse(doc, options)
  }

  private isMatchingCategory(
    secType: string | null,
    titleNode: Element | null,
    category: SectionCategory
  ) {
    if (
      (secType && category.synonyms.includes(secType)) ||
      category.id === secType
    ) {
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

  private chooseSectionCategory(section: HTMLElement) {
    const secType = section.getAttribute('sec-type')
    const titleNode = section.firstElementChild

    for (const category of this.sectionCategories) {
      if (this.isMatchingCategory(secType, titleNode, category)) {
        return category.id
      }
    }
  }

  private parsePriority = (priority: string | null) => {
    if (!priority) {
      return undefined
    }
    return parseInt(priority)
  }

  private getEquationContent = (p: string | HTMLElement) => {
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

  private parseHistoryDates = (historyNode: Element | null) => {
    if (!historyNode) {
      return undefined
    }
    const history: {
      acceptanceDate?: number
      correctionDate?: number
      retractionDate?: number
      revisionRequestDate?: number
      revisionReceiveDate?: number
      receiveDate?: number
    } = {}

    for (const date of historyNode.children) {
      const dateType = date.getAttribute('date-type')
      switch (dateType) {
        case 'received': {
          history.receiveDate = dateToTimestamp(date)
          break
        }
        case 'rev-recd': {
          history.revisionReceiveDate = dateToTimestamp(date)
          break
        }
        case 'accepted': {
          history.acceptanceDate = dateToTimestamp(date)
          break
        }
        case 'rev-request': {
          history.revisionRequestDate = dateToTimestamp(date)
          break
        }
        case 'retracted': {
          history.retractionDate = dateToTimestamp(date)
          break
        }
        case 'corrected': {
          history.correctionDate = dateToTimestamp(date)
          break
        }
      }
    }
    return history
  }

  private getEmail = (element: HTMLElement) => {
    const email = element.querySelector('email')
    if (email) {
      return {
        href: email.getAttributeNS(this.XLINK_NAMESPACE, 'href') ?? '',
        text: getTrimmedTextContent(email) ?? '',
      }
    }
  }

  private getFigureAttrs = (node: HTMLElement | string | Node) => {
    const element = node as HTMLElement
    const parentElement = element.parentElement
    return {
      id: element.getAttribute('id'),
      type:
        parentElement?.getAttribute('fig-type') ??
        element.getAttribute('content-type') ??
        '',
      src: element.getAttributeNS(this.XLINK_NAMESPACE, 'href'),
    }
  }

  private getInstitutionDetails = (element: HTMLElement) => {
    let department = ''
    let institution = ''
    for (const node of element.querySelectorAll('institution')) {
      const content = getTrimmedTextContent(node)
      if (!content) {
        continue
      }
      const type = node.getAttribute('content-type')
      if (type === 'dept') {
        department = content
      } else {
        institution = content
      }
    }
    return { department, institution }
  }

  private getAddressLine = (element: HTMLElement, index: number) => {
    return (
      getTrimmedTextContent(element, `addr-line:nth-of-type(${index})`) || ''
    )
  }

  private choosePublicationType = (element: Element) => {
    const citationElement = element.querySelector(
      'element-citation, mixed-citation'
    )
    const type = citationElement?.getAttribute('publication-type')
    return type ? publicationTypeToPM[type] ?? type : 'article-journal'
  }

  private getNameContent(element: Element, query: string) {
    const buildName = (node: Element) => {
      const name = buildBibliographicName({})
      const given = getTrimmedTextContent(node, 'given-names')
      const family = getTrimmedTextContent(node, 'surname')

      if (given) {
        name.given = given
      }
      if (family) {
        name.family = family
      }
      if (node.nodeName === 'collab') {
        name.literal = getTrimmedTextContent(node)
      }
      return name
    }
    const personNodes = element.querySelectorAll(query)
    if (personNodes.length) {
      return Array.from(personNodes).map(buildName)
    }
  }

  private getDateContent(element: Element, query: string) {
    const buildDate = (element: Element) => {
      const isoDate = element.getAttribute('iso-8601-date')
      if (!isoDate) {
        return
      }

      const parsedDate = new Date(Date.parse(isoDate))

      const parts: [number, number, number] = [
        parsedDate.getFullYear(),
        parsedDate.getMonth() + 1, //month is 0 indexed.
        parsedDate.getDate(),
      ]

      return buildBibliographicDate({
        'date-parts': [parts],
      })
    }

    const dateElement = element.querySelector(query)
    if (dateElement) {
      return buildDate(dateElement)
    }
  }

  private getFigContent = (node: Node) => {
    const element = node as HTMLElement
    const content = [
      this.schema.nodes.figure.create(this.getFigureAttrs(element)),
    ]
    const altText = element.querySelector('alt-text')
    if (altText) {
      const altTextNode = this.schema.nodes.alt_text.create()
      content.push(this.parse(altText, { topNode: altTextNode }))
    }
    const longDesc = element.querySelector('long-desc')
    if (longDesc) {
      const longDescNode = this.schema.nodes.long_desc.create()
      content.push(this.parse(longDesc, { topNode: longDescNode }))
    }
    return Fragment.from(content)
  }

  private parseRefLiteral = (element: Element) => {
    const mixedCitation = element.querySelector('mixed-citation')
    const hasDirectTextNodeWithLetters = Array.from(
      mixedCitation?.childNodes ?? []
    ).some(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.match(/[A-Za-z]+/g)
    )

    if (hasDirectTextNodeWithLetters) {
      return getTrimmedTextContent(mixedCitation)
    }
  }
  private parseRefPages = (element: Element) => {
    const fpage = getTrimmedTextContent(element, 'fpage')
    const lpage = getTrimmedTextContent(element, 'lpage')
    if (fpage) {
      return lpage ? `${fpage}-${lpage}` : fpage
    }
  }

  private parseRef = (element: Element) => {
    return {
      id: element.id,
      type: this.choosePublicationType(element),
      comment: getTrimmedTextContent(element, 'comment'),
      volume: getTrimmedTextContent(element, 'volume'),
      issue: getTrimmedTextContent(element, 'issue'),
      supplement: getTrimmedTextContent(element, 'supplement'),
      DOI: getTrimmedTextContent(element, 'pub-id[pub-id-type="doi"]'),
      URL: getTrimmedTextContent(element, 'ext-link[ext-link-type="uri"]'),
      std: getTrimmedTextContent(
        element,
        'pub-id[pub-id-type="std-designation"]'
      ),
      'collection-title': getTrimmedTextContent(element, 'series'),
      edition: getTrimmedTextContent(element, 'edition'),
      publisher: getTrimmedTextContent(element, 'publisher-name'),
      'publisher-place': getTrimmedTextContent(element, 'publisher-loc'),
      event: getTrimmedTextContent(element, 'conf-name'),
      'event-place': getTrimmedTextContent(element, 'conf-loc'),
      'number-of-pages': getTrimmedTextContent(element, 'size[units="pages"]'),
      institution: getTrimmedTextContent(element, 'institution'),
      locator: getTrimmedTextContent(element, 'elocation-id'),
      'container-title': getHTMLContent(element, 'source'),
      title:
        getHTMLContent(element, 'article-title') ??
        getHTMLContent(element, 'data-title') ??
        getHTMLContent(element, 'part-title'),
      author: this.getNameContent(
        element,
        'person-group[person-group-type="author"] > *'
      ),
      editor: this.getNameContent(
        element,
        'person-group[person-group-type="editor"] > *'
      ),
      literal: this.parseRefLiteral(element),
      accessed: this.getDateContent(element, 'date-in-citation'),
      'event-date': this.getDateContent(element, 'conf-date'),
      issued: getTrimmedTextContent(
        element.querySelector('element-citation, mixed-citation'),
        ':scope > year'
      )
        ? buildBibliographicDate({
            'date-parts': [
              [
                getTrimmedTextContent(
                  element.querySelector('element-citation, mixed-citation'),
                  ':scope > year'
                ) || '',
                getTrimmedTextContent(
                  element.querySelector('element-citation, mixed-citation'),
                  ':scope > month'
                ) || '',
                getTrimmedTextContent(
                  element.querySelector('element-citation, mixed-citation'),
                  ':scope > day'
                ) || '',
              ],
            ],
          })
        : undefined,
      page: this.parseRefPages(element),
    }
  }

  private nodes: NodeRule[] = [
    {
      tag: 'long-desc',
      node: 'long_desc',
    },
    {
      tag: 'alt-text',
      node: 'alt_text',
    },
    {
      tag: 'attachments > self-uri',
      node: 'attachment',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(this.XLINK_NAMESPACE, 'href') || '',
          type: element.getAttribute('content-type') || '',
        }
      },
    },
    {
      tag: 'article',
      node: 'manuscript',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const doi = element.querySelector(
          'front > article-meta > article-id[pub-id-type="doi"]'
        )
        const history = element.querySelector('history')
        const dates = this.parseHistoryDates(history)
        return {
          doi: getTrimmedTextContent(doi),
          articleType: element.getAttribute('article-type') ?? '',
          primaryLanguageCode: element.getAttribute('lang') ?? '',
          ...dates,
        }
      },
    },
    {
      tag: 'titles',
      node: 'alt_titles',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
    },
    {
      tag: 'alt-title[alt-title-type]',
      node: 'alt_title',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          type: element.getAttribute('alt-title-type'),
        }
      },
    },
    {
      tag: 'article-title',
      node: 'title',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          type: element.getAttribute('type') || '',
        }
      },
    },

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
      tag: 'comments',
      node: 'comments',
    },
    {
      tag: 'comment',
      node: 'comment',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          target: element.getAttribute('target-id'),
          contents: getTrimmedTextContent(element),
          contributions: [buildContribution(DEFAULT_PROFILE_ID)],
        }
      },
    },
    {
      tag: 'author-notes',
      node: 'author_notes',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
    },
    {
      tag: 'funding-group',
      node: 'awards',
    },
    {
      tag: 'award-group',
      node: 'award',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          recipient: getTrimmedTextContent(
            element,
            'principal-award-recipient'
          ),
          code: Array.from(element.querySelectorAll('award-id'))
            .map((awardID) => getTrimmedTextContent(awardID))
            .reduce((acc, text) => (acc ? `${acc};${text}` : text), ''),
          source: getTrimmedTextContent(element, 'funding-source'),
        }
      },
    },
    {
      tag: 'fn[fn-type]', // all supported fn-types should be moved out by the time we parse into prosemirror
      context: 'author_notes/',
      ignore: true,
    },
    {
      tag: 'fn:not([fn-type])',
      node: 'footnote',
      context: 'author_notes/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          kind: 'footnote',
        }
      },
    },
    {
      tag: 'corresp',
      node: 'corresp',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const label = element.querySelector('label')
        if (label) {
          label.remove()
        }
        return {
          id: element.getAttribute('id'),
          label: getTrimmedTextContent(label),
        }
      },
      getContent: (node) => {
        const element = node as HTMLElement
        return Fragment.from(
          this.schema.text(getTrimmedTextContent(element) || '')
        )
      },
    },
    {
      tag: 'contrib[contrib-type="author"]',
      node: 'contributor',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const footnote: ContributorFootnote[] = []
        const affiliations: string[] = []
        const corresp: ContributorCorresp[] = []

        const xrefs = element.querySelectorAll('xref')
        for (const xref of xrefs) {
          const rid = xref.getAttribute('rid')
          const type = xref.getAttribute('ref-type')
          if (!rid) {
            continue
          }
          switch (type) {
            case 'fn':
              footnote.push({
                noteID: rid,
                noteLabel: getTrimmedTextContent(xref) || '',
              })
              break
            case 'corresp':
              corresp.push({
                correspID: rid,
                correspLabel: getTrimmedTextContent(xref) || '',
              })
              break
            case 'aff':
              affiliations.push(rid)
              break
          }
        }

        return {
          id: element.getAttribute('id') || undefined,
          role: getTrimmedTextContent(element, 'role'),
          affiliations,
          corresp,
          footnote,
          isCorresponding: element.getAttribute('corresp')
            ? element.getAttribute('corresp') === 'yes'
            : undefined,
          bibliographicName: {
            given: getTrimmedTextContent(element, 'name > given-names'),
            family: getTrimmedTextContent(element, 'name > surname'),
            ObjectType: ObjectTypes.BibliographicName,
          },
          ORCIDIdentifier: getTrimmedTextContent(
            element,
            'contrib-id[contrib-id-type="orcid"]'
          ),
          CRediTRoles: getCRediTRoleRole(element),
          priority: this.parsePriority(element.getAttribute('priority')),
          email: getTrimmedTextContent(element, 'email') || '',
          prefix: getTrimmedTextContent(element, 'prefix'),
        }
      },
      getContent: () => {
        return Fragment.from(this.schema.text('_'))
      },
    },
    {
      tag: 'affiliations',
      node: 'affiliations',
    },
    {
      tag: 'aff',
      node: 'affiliation',
      context: 'affiliations/',
      getAttrs: (node) => {
        const element = node as HTMLElement

        const { department, institution } = this.getInstitutionDetails(element)

        return {
          id: element.getAttribute('id'),
          institution: institution ?? '',
          department: department ?? '',
          addressLine1: this.getAddressLine(element, 1),
          addressLine2: this.getAddressLine(element, 2),
          addressLine3: this.getAddressLine(element, 3),
          postCode: getTrimmedTextContent(element, 'postal-code') ?? '',
          country: getTrimmedTextContent(element, 'country') ?? '',
          email: this.getEmail(element),
          priority: this.parsePriority(element.getAttribute('priority')),
        }
      },
      getContent: () => {
        return Fragment.from(this.schema.text('_'))
      },
    },

    {
      tag: 'attrib',
      node: 'attribution',
    },
    {
      tag: 'back',
      ignore: true,
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
          content.push(this.parse(title, { topNode: captionTitle }))
        }

        const paragraphs = element.querySelectorAll('p')
        if (paragraphs.length) {
          const figcaption = schema.nodes.caption.create()
          for (const paragraph of paragraphs) {
            content.push(this.parse(paragraph, { topNode: figcaption }))
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
          contents: getTrimmedTextContent(element),
        }
      },
    },
    {
      tag: 'inline-formula',
      node: 'inline_equation',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return this.getEquationContent(element)
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
        const attrs = this.getEquationContent(element)
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
      tag: 'disp-quote',
      node: 'pullquote_element',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
    {
      tag: 'graphic',
      node: 'quote_image',
      context: 'pullquote_element/',
      getAttrs: this.getFigureAttrs,
    },
    {
      tag: 'inline-graphic',
      context: 'link/',
      node: 'inline_figure',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          src: element.getAttributeNS(this.XLINK_NAMESPACE, 'href'),
          altText: getTrimmedTextContent(element, 'alt-text'),
          longDesc: getTrimmedTextContent(element, 'long-desc'),
        }
      },
    },
    {
      tag: 'inline-graphic',
      ignore: true,
    },
    {
      tag: 'ext-link',
      node: 'link',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          href: element.getAttributeNS(this.XLINK_NAMESPACE, 'href') || '',
          title: element.getAttributeNS(this.XLINK_NAMESPACE, 'title') || '',
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
      tag: 'media',
      node: 'embed',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(this.XLINK_NAMESPACE, 'href'),
          mimetype: element.getAttribute('mimetype'),
          mimeSubtype: element.getAttribute('mime-subtype'),
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
      tag: 'graphic[content-type=leading]',
      node: 'hero_image',
      getContent: this.getFigContent,
    },
    {
      tag: 'graphic',
      node: 'figure',
      context: 'figure_element/',
      getAttrs: this.getFigureAttrs,
    },
    {
      tag: 'graphic',
      node: 'image_element',
      getContent: this.getFigContent,
    },
    {
      tag: 'fig',
      node: 'figure_element',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const attrib = element.querySelector('attrib')
        const attribution = attrib
          ? {
              literal: getTrimmedTextContent(attrib) ?? '',
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
          const content = this.parse(p, {
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
      context: 'section/',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
    {
      tag: 'p',
      node: 'paragraph',
    },
    {
      tag: 'sec[sec-type="endnotes"]',
      node: 'footnotes_section', // NOTE: higher priority than 'section'
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
          // category: chooseSectionCategory(element), // 'MPSectionCategory:endnotes',
        }
      },
    },
    {
      tag: 'sec[sec-type="keywords"]',
      node: 'keywords', // NOTE: higher priority than 'section'
    },
    {
      tag: 'sec[sec-type="supplementary-material"]',
      node: 'supplements', // NOTE: higher priority than 'section'
    },
    {
      tag: 'supplementary-material',
      node: 'supplement', // NOTE: higher priority than 'section'
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(this.XLINK_NAMESPACE, 'href'),
          mimeType: element.getAttribute('mimetype'),
          mimeSubType: element.getAttribute('mime-subtype'),
          title: getTrimmedTextContent(element, 'title'),
        }
      },
    },
    {
      tag: 'sec[sec-type="abstracts"]',
      node: 'abstracts',
    },
    {
      tag: 'sec[sec-type="body"]',
      node: 'body',
    },
    {
      tag: 'sec[sec-type="backmatter"]',
      node: 'backmatter',
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
      getAttrs: (node) => this.parseRef(node as Element),
    },
    {
      tag: 'sec[sec-type="abstract-graphical"]',
      node: 'graphical_abstract_section',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          category: this.chooseSectionCategory(element),
        }
      },
    },
    {
      tag: 'sec[sec-type="abstract-key-image"]',
      node: 'graphical_abstract_section',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          category: this.chooseSectionCategory(element),
        }
      },
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
      tag: 'kwd-group-list',
      context: 'keywords/',
      node: 'keywords_element',
    },
    {
      tag: 'kwd-group',
      context: 'keywords_element/',
      node: 'keyword_group',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.id,
          type: element.getAttribute('kwd-group-type'),
        }
      },
    },
    {
      tag: 'kwd',
      context: 'keyword_group//',
      node: 'keyword',
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
          contents: getTrimmedTextContent(element),
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

  private marks: MarkRule[] = [
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
