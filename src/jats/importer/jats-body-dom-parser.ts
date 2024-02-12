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

import mime from 'mime'
import { DOMParser, Fragment, ParseRule } from 'prosemirror-model'

import { Marks, Nodes, schema } from '../../schema'
import { chooseSectionCategory } from '../../transformer'

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

const getEquationContent = (p: string | HTMLElement) => {
  const element = p as HTMLElement
  const container = element.querySelector('alternatives') ?? element
  let contents: string | null = ''
  let format: string | null = ''
  for (const child of container.childNodes) {
    // remove namespace prefix
    // TODO: real namespaces
    const nodeName = child.nodeName.replace(/^[a-z]:/, '')

    switch (nodeName) {
      case 'tex-math':
      case 'mml:math':
        contents = (child as Element).outerHTML
        format = nodeName === 'tex-math' ? 'tex' : 'mathml'
        break
    }
  }
  return { format, contents }
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
      const id = element.getAttribute('id')
      return Fragment.from([
        schema.nodes.equation.createChecked({ id, ...attrs }),
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
