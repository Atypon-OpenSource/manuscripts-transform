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

// TODO: remove element.getAttribute('id') and rewrite cross-references?

// https://jats.nlm.nih.gov/articleauthoring/tag-library/1.2/

import mime from 'mime'
import { DOMParser, Fragment, ParseRule } from 'prosemirror-model'

import { convertMathMLToSVG } from '../../mathjax/mathml-to-svg'
import { convertTeXToSVG } from '../../mathjax/tex-to-svg'
import { Marks, Nodes, schema } from '../../schema'
import { chooseSectionCategory, xmlSerializer } from '../../transformer'

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const chooseContentType = (graphicNode?: Element): string | undefined => {
  if (graphicNode) {
    const mimetype = graphicNode.getAttribute('mimetype')
    const subtype = graphicNode.getAttribute('mime-subtype')

    if (mimetype && subtype) {
      return [mimetype, subtype].join('/')
    }

    const href = graphicNode.getAttributeNS(XLINK_NAMESPACE, 'href')

    if (href) {
      return mime.getType(href) || undefined
    }
  }
}

export type MarkRule = ParseRule & { mark: Marks | null }

const marks: MarkRule[] = [
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

export type NodeRule = ParseRule & { node?: Nodes | null }

const nodes: NodeRule[] = [
  {
    tag: 'attrib',
    node: 'attribution',
  },
  {
    tag: 'back',
    ignore: true,
  },
  {
    tag: 'body',
    node: 'manuscript',
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
    context: 'figure_element/',
    getContent: (node, schema) => {
      const element = node as HTMLElement

      const content = []

      const title = element.querySelector('title')
      if (title) {
        const captionTitle = schema.nodes.caption_title.create()
        content.push(jatsBodyDOMParser.parse(title, { topNode: captionTitle }))
      }

      const paragraphs = element.querySelectorAll('p')
      if (paragraphs.length) {
        const figcaption = schema.nodes.caption.create()
        for (const paragraph of paragraphs) {
          content.push(
            jatsBodyDOMParser.parse(paragraph, { topNode: figcaption })
          )
        }
      }

      return Fragment.from(content) as Fragment
    },
  },
  {
    tag: 'caption',
    node: 'figcaption',
    context: 'table_element/',
  },
  {
    tag: 'code',
    node: 'listing',
    context: 'listing_element/',
    // preserveWhitespace: 'full',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        language: element.getAttribute('language') ?? '',
        contents: element.textContent?.trim() ?? '',
      }
    },
  },
  {
    tag: 'inline-formula',
    node: 'inline_equation',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const attrs: {
        id: string | null
        MathMLRepresentation: string // NOTE: not MathMLStringRepresentation
        SVGRepresentation: string // NOTE: not SVGStringRepresentation
        TeXRepresentation: string
      } = {
        id: element.getAttribute('id'),
        MathMLRepresentation: '', // default
        SVGRepresentation: '',
        TeXRepresentation: '', // default
      }

      const container = element.querySelector('alternatives') ?? element

      for (const child of container.childNodes) {
        // remove namespace prefix
        // TODO: real namespaces
        const nodeName = child.nodeName.replace(/^[a-z]:/, '')

        switch (nodeName) {
          case 'tex-math':
            attrs.TeXRepresentation = child.textContent?.trim() ?? ''
            if (attrs.TeXRepresentation) {
              attrs.SVGRepresentation =
                convertTeXToSVG(attrs.TeXRepresentation, true) ?? ''
            }
            break

          case 'mml:math':
            ;(child as Element).removeAttribute('id')
            // FIXME: remove namespace?
            attrs.MathMLRepresentation = xmlSerializer.serializeToString(child)
            // TODO: convert MathML to TeX with mml2tex?
            if (attrs.MathMLRepresentation) {
              attrs.SVGRepresentation =
                convertMathMLToSVG(attrs.MathMLRepresentation, true) ?? ''
            }
            // TODO: add format property (TeX or MathML)
            // TODO: make MathMLRepresentation editable
            break
        }
      }

      return attrs
    },
  },
  {
    tag: 'disp-formula',
    node: 'equation_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const caption = element.querySelector('figcaption')

      return {
        id: element.getAttribute('id'),
        suppressCaption: !caption,
      }
    },
    getContent: (node, schema) => {
      const element = node as HTMLElement

      const attrs: {
        MathMLStringRepresentation: string
        SVGStringRepresentation: string
        TeXRepresentation: string
      } = {
        // id: generateID(ObjectTypes.Equation)
        MathMLStringRepresentation: '',
        SVGStringRepresentation: '',
        TeXRepresentation: '',
      }

      const container = element.querySelector('alternatives') ?? element

      for (const child of container.childNodes) {
        // remove namespace prefix
        // TODO: real namespaces
        const nodeName = child.nodeName.replace(/^[a-z]:/, '')

        switch (nodeName) {
          case 'tex-math':
            attrs.TeXRepresentation = child.textContent?.trim() ?? ''
            if (attrs.TeXRepresentation) {
              attrs.SVGStringRepresentation =
                convertTeXToSVG(attrs.TeXRepresentation, true) ?? ''
            }
            break

          case 'mml:math':
            ;(child as Element).removeAttribute('id')
            // TODO: remove namespace?
            attrs.MathMLStringRepresentation =
              xmlSerializer.serializeToString(child)
            // TODO: convert MathML to TeX with mml2tex?
            if (attrs.MathMLStringRepresentation) {
              attrs.SVGStringRepresentation =
                convertMathMLToSVG(attrs.MathMLStringRepresentation, true) ?? ''
            }
            // TODO: add format property (TeX or MathML)
            // TODO: make MathMLRepresentation editable
            break
        }
      }

      const caption = element.querySelector('figcaption')

      const figcaption = schema.nodes.figcaption.create()

      return Fragment.from([
        schema.nodes.equation.createChecked(attrs),
        caption
          ? // TODO This seems very illegal
            jatsBodyDOMParser.parse(caption, {
              topNode: figcaption,
            })
          : figcaption,
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
        href: element.getAttributeNS(XLINK_NAMESPACE, 'href') || '',
        title: element.getAttributeNS(XLINK_NAMESPACE, 'title') || '',
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
    context: 'figure_element/',
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
    getAttrs: (node) => {
      const element = node as HTMLElement

      const position = element.getAttribute('position')

      const src = element.getAttributeNS(XLINK_NAMESPACE, 'href')

      return {
        id: element.getAttribute('id'),
        contentType: chooseContentType(element || undefined) || '',
        src,
        position,
      }
    },
  },
  {
    tag: 'fig',
    node: 'figure_element',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const labelNode = element.querySelector('label')
      if (labelNode) {
        element.removeChild(labelNode)
      }
      const attrib = element.querySelector('attrib')
      const position = element.getAttribute('position')

      const attribution = attrib
        ? {
            literal: attrib.textContent?.trim() ?? '',
          }
        : undefined

      return {
        id: element.getAttribute('id'),
        label: labelNode?.textContent?.trim() ?? '',
        attribution: attribution,
        position,
      }
    },
  },
  {
    tag: 'ref',
    node: 'bibliography_item',
    context: 'bibliography_element/',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const ref = {
        id: element.getAttribute('id'),
        type: element.getAttribute('type'),
      } as any

      const author = element.getAttribute('author')
      if (author) {
        ref.author = author
      }

      const issued = element.getAttribute('issued')
      if (issued) {
        ref.issued = issued
      }

      const containerTitle = element.getAttribute('container-title')
      if (containerTitle) {
        ref.containerTitle = containerTitle
      }

      const doi = element.getAttribute('doi')
      if (doi) {
        ref.doi = doi
      }

      const volume = element.getAttribute('volume')
      if (volume) {
        ref.volume = volume
      }

      const issue = element.getAttribute('issue')
      if (issue) {
        ref.issue = issue
      }

      const supplement = element.getAttribute('supplement')
      if (supplement) {
        ref.supplement = supplement
      }

      const page = element.getAttribute('page')
      if (page) {
        ref.page = page
      }

      const title = element.getAttribute('title')
      if (title) {
        ref.title = title
      }

      const literal = element.getAttribute('literal')
      if (literal) {
        ref.literal = literal
      }

      return ref
    },
  },
  {
    tag: 'ref-list',
    node: 'bibliography_element',
    context: 'bibliography_section/',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const titleNode = element.querySelector('title')
      if (titleNode) {
        element.removeChild(titleNode)
      }
      return {
        id: element.getAttribute('id'),
        contents: '',
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
    tag: 'list[list-type=bullet]',
    node: 'bullet_list',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'list[list-type]',
    node: 'ordered_list',
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
  // {
  //   tag: 'math',
  //   namespace: 'http://www.w3.org/1998/Math/MathML',
  //   node: 'equation',
  // },
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
    tag: 'sec[sec-type="bibliography"]',
    node: 'bibliography_section', // NOTE: higher priority than 'section'
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'sec[sec-type="affiliations"]',
    node: 'affiliations', // NOTE: higher priority than 'section'
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        category: 'MPSectionCategory:affiliations',
      }
    },
  },
  {
    tag: 'aff',
    node: 'affiliation',
    context: 'affiliations/',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const aff = {
        id: element.getAttribute('id'),
      } as any
      const institution = element.getAttribute('institution')
      if (institution) {
        aff.institution = institution
      }
      const email = element.getAttribute('email')
      if (email) {
        aff.bibliographicName = JSON.parse(email)
      }
      const department = element.getAttribute('department')
      if (department) {
        aff.department = department
      }
      const addressLine1 = element.getAttribute('addressLine1')
      if (addressLine1) {
        aff.addressLine1 = addressLine1
      }

      const addressLine2 = element.getAttribute('addressLine2')
      if (addressLine2) {
        aff.addressLine2 = addressLine2
      }

      const addressLine3 = element.getAttribute('addressLine3')
      if (addressLine3) {
        aff.addressLine3 = addressLine3
      }

      const postCode = element.getAttribute('postCode')
      if (postCode) {
        aff.postCode = postCode
      }
      const country = element.getAttribute('country')
      if (country) {
        aff.country = country
      }
      const priority = element.getAttribute('priority')
      if (priority) {
        aff.priority = parseInt(priority)
      }
      return aff
    },
  },
  {
    tag: 'sec[sec-type="contributors"]',
    node: 'contributors', // NOTE: higher priority than 'section'
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        category: 'MPSectionCategory:contributors',
      }
    },
  },
  {
    tag: 'contrib',
    node: 'contributor',
    context: 'contributors/',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const contrib = {
        id: element.getAttribute('id'),
      } as any

      const role = element.getAttribute('role')
      if (role) {
        contrib.role = role
      }

      const affiliations = element.getAttribute('affiliations')
      if (affiliations) {
        contrib.affiliations = JSON.parse(affiliations)
      }

      const footnote = element.getAttribute('footnote')
      if (footnote) {
        contrib.footnote = JSON.parse(footnote)
      }

      const corresp = element.getAttribute('corresp')
      if (corresp) {
        contrib.corresp = JSON.parse(corresp)
      }
      const bibliographicName = element.getAttribute('bibliographicName')
      if (bibliographicName) {
        contrib.bibliographicName = JSON.parse(bibliographicName)
      }
      const userID = element.getAttribute('userID')
      if (userID) {
        contrib.userID = userID
      }
      const priority = element.getAttribute('priority')
      if (priority) {
        contrib.priority = parseInt(priority)
      }
      const invitationID = element.getAttribute('invitationID')
      if (invitationID) {
        contrib.invitationID = invitationID
      }
      const objectType = element.getAttribute('objectType')
      if (objectType) {
        contrib.objectType = objectType
      }
      const isCorresponding = element.getAttribute('isCorresponding')
      if (isCorresponding) {
        contrib.isCorresponding = JSON.parse(isCorresponding)
      }
      const ORCIDIdentifier = element.getAttribute('ORCIDIdentifier')
      if (ORCIDIdentifier) {
        contrib.ORCIDIdentifier = ORCIDIdentifier
      }
      return contrib
    },
  },
  {
    tag: 'sec[sec-type="keywords"]',
    node: 'keywords', // NOTE: higher priority than 'section'
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
    tag: 'sec',
    node: 'section',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        category: chooseSectionCategory(element),
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
    tag: 'label',
    context: 'section/',
    node: 'section_label',
  },
  {
    tag: 'label',
    context: 'table_element/',
    ignore: true, // TODO
  },
  {
    tag: 'label',
    context: 'figure/',
    ignore: true, // TODO
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
        suppressFooter: !element.querySelector('table > tfoot > tr'),
        suppressHeader: !element.querySelector('table > thead > tr'),
      }
    },
  },
  {
    tag: 'tbody',
    skip: true,
  },
  {
    tag: 'tfoot',
    skip: true,
  },
  {
    tag: 'thead',
    skip: true,
  },
  {
    tag: 'title',
    node: 'section_title',
    context: 'section/|footnotes_section/|bibliography_section/|keywords/',
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
      const colspan = element.getAttribute('colspan')
      const rowspan = element.getAttribute('rowspan')
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
    node: 'table_cell',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const colspan = element.getAttribute('colspan')
      const rowspan = element.getAttribute('rowspan')
      return {
        celltype: 'th',
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
      const embeddedCitationAttr = element.getAttribute(
        'data-reference-embedded-citation'
      )

      return {
        rid: element.getAttribute('rid'),
        contents: element.textContent?.trim(), // TODO: innerHTML?
        embeddedCitationItems: embeddedCitationAttr
          ? JSON.parse(embeddedCitationAttr)
          : null,
      }
    },
  },
  {
    tag: 'xref[ref-type="fn"]',
    node: 'inline_footnote',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        rid: element.getAttribute('rid'),
        contents: element.textContent?.trim(),
      }
    },
  },
  {
    tag: 'xref',
    node: 'cross_reference',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        rid: element.getAttribute('rid'),
        label: element.textContent?.trim(),
      }
    },
  },
]

// metadata
// address, addr-line, aff, article-title, city,

export const jatsBodyDOMParser = new DOMParser(schema, [...marks, ...nodes])
