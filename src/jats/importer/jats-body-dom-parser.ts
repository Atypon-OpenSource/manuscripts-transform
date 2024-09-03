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

import { ObjectTypes } from '@manuscripts/json-schema'
import mime from 'mime'
import { DOMParser, Fragment, ParseRule } from 'prosemirror-model'

import { ManuscriptNode, Marks, Nodes, schema } from '../../schema'
import { chooseSectionCategory, generateID, timestamp } from '../../transformer'
import { DEFAULT_PROFILE_ID } from './jats-comments'

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const highlightMarkers: string[] = []
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

const getEquationContent = (p: string | HTMLElement) => {
  const element = p as HTMLElement
  const id = element.getAttribute('id')
  const container = element.querySelector('alternatives') ?? element
  let contents: string | null = ''
  let format: string | null = ''
  for (const child of container.childNodes) {
    // remove namespace prefix
    // TODO: real namespaces
    const nodeName = child.nodeName.replace(/^[a-z]:/, '')

    switch (nodeName) {
      case 'tex-math':
        contents = (child as Element).innerHTML
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
    tag: 'highlight-marker',
    node: 'highlight_marker',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const parentNode = element.parentNode as HTMLElement
      const id = element.getAttribute('id')
      if (id) {
        highlightMarkers.push(id)
      }
      return {
        id: element.getAttribute('id'),
        tid: parentNode.getAttribute('id'),
        position: element.getAttribute('position'),
      }
    },
  },
  {
    tag: 'comment-annotation',
    node: 'comment',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const id = element.getAttribute('id')
      if (!id) {
        return null
      }
      if (!highlightMarkers.includes(id)) {
        return false
      }
      return {
        id: element.getAttribute('id'),
        contents: element.textContent,
        selector: {
          from: parseInt(element.getAttribute('from') || '0'),
          to: parseInt(element.getAttribute('to') || '0'),
        },
        contributions: [
          {
            _id: generateID(ObjectTypes.Contribution),
            objecType: ObjectTypes.Contribution,
            profileID: DEFAULT_PROFILE_ID,
            timestamp: timestamp(),
          },
        ],
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
      }
    },
  },
  {
    tag: 'author-notes-title',
    node: 'section_title',
  },
  {
    tag: 'bibliography-title',
    node: 'section_title',
    getContent: () => {
      return Fragment.from(schema.text('References'))
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
    tag: 'fn-author',
    node: 'footnote',

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
      return {
        id: element.getAttribute('id'),
        label: element.getAttribute('label'),
      }
    },
    getContent: (node) => {
      const element = node as HTMLElement
      return Fragment.from(schema.text(element.textContent?.trim() || ''))
    },
  },
  {
    tag: 'contributors',
    node: 'contributors',
  },
  {
    tag: 'contributor',
    node: 'contributor',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const footnote: {
        noteID: string
        noteLabel: string
      }[] = []
      const affiliations: string[] = []
      const corresp: {
        correspID: string
        correspLabel: string
      }[] = []
      element.querySelectorAll('fn').forEach((fn) => {
        const noteID = fn.getAttribute('noteID')
        const noteLabel = fn.getAttribute('noteLabel')
        if (noteID && noteLabel) {
          footnote.push({ noteID, noteLabel })
        }
      })

      element.querySelectorAll('corresp').forEach((correspondence) => {
        const correspLabel = correspondence.getAttribute('correspLabel')
        const correspID = correspondence.getAttribute('correspID')
        if (correspID && correspLabel) {
          corresp.push({ correspID, correspLabel })
        }
      })

      element.querySelectorAll('aff').forEach((aff) => {
        const affID = aff.getAttribute('affiliationID')
        if (affID) {
          affiliations.push(affID)
        }
      })

      return {
        id: element.getAttribute('id'),
        role: element.getAttribute('role'),
        isCorresponding: element.getAttribute('isCorresponding'),
        bibliographicName: {
          given: element.getAttribute('given'),
          family: element.getAttribute('family'),
          ObjectType: 'MPBibliographicName',
          _id: generateID(ObjectTypes.BibliographicName),
        },
        affiliations,
        corresp,
        footnote,
        ORCIDIdentifier: element.getAttribute('ORCIDIdentifier'),
        priority: element.getAttribute('priority'),
      }
    },
  },
  {
    tag: 'affiliations',
    node: 'affiliations',
  },
  {
    tag: 'affiliation',
    node: 'affiliation',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const emailText = element.getAttribute('email-text')
      const emailHref = element.getAttribute('email-href')
      const email =
        emailText && emailHref
          ? {
              text: emailText,
              href: emailHref,
            }
          : undefined

      return {
        id: element.getAttribute('id'),
        institution: element.getAttribute('institution') || '',
        department: element.getAttribute('department') || '',
        addressLine1: element.getAttribute('addressLine1') || '',
        addressLine2: element.getAttribute('addressLine2') || '',
        addressLine3: element.getAttribute('addressLine3') || '',
        postCode: element.getAttribute('postCode') || '',
        country: element.getAttribute('country') || '',
        email: email,
        priority: parseInt(element.getAttribute('priority') || '0'),
      }
    },
    getContent: () => {
      return Fragment.from(schema.text('_'))
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
      return getEquationContent(element)
    },
  },
  {
    tag: 'disp-formula',
    node: 'equation_element',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        label: element.querySelector('label')?.textContent ?? '',
      }
    },
    getContent: (node, schema) => {
      const element = node as HTMLElement
      const attrs = getEquationContent(element)
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
        const paragraph = schema.nodes.paragraph.create()
        const content = jatsBodyDOMParser.parse(p, {
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
        href: element.getAttributeNS(XLINK_NAMESPACE, 'href'),
        mimeType: element.getAttribute('mimetype'),
        mimeSubType: element.getAttribute('mime-subtype'),
        title: element.querySelector('title')?.textContent,
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
    tag: 'sec[sec-type="bibliography"',
    node: 'bibliography_section',
  },
  {
    tag: 'bibliography-element',
    node: 'bibliography_element',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'bibliography-item',
    node: 'bibliography_item',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        type: element.getAttribute('type'),
        containerTitle: element.getAttribute('container-title'),
        volume: element.getAttribute('volume'),
        issue: element.getAttribute('issue'),
        supplement: element.getAttribute('supplement'),
        page: element.getAttribute('page'),
        title: element.getAttribute('title'),
        literal: element.getAttribute('literal'),
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
      }
    },
  },
  {
    tag: 'title',
    node: 'section_title',
    context:
      'section/|footnotes_section/|bibliography_section/|keywords/|supplements/',
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
    node: 'table_header',
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
        contents: element.textContent?.trim(), // TODO: innerHTML?
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
        rids: element.getAttribute('rid')?.split(/\s+/) || [],
        label: element.textContent?.trim(),
      }
    },
  },
]

// metadata
// address, addr-line, aff, article-title, city,

export const jatsBodyDOMParser = new DOMParser(schema, [...marks, ...nodes])
