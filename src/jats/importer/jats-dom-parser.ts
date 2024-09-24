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

import { BibliographicName, ObjectTypes } from '@manuscripts/json-schema'
import mime from 'mime'
import { DOMParser, Fragment, ParseRule } from 'prosemirror-model'

import { getTrimmedTextContent, timestamp } from '../../lib/utils'
import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  Marks,
  Nodes,
  schema,
} from '../../schema'
import { chooseSectionCategory, generateID } from '../../transformer'
import { DEFAULT_PROFILE_ID } from './jats-comments'

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

const parsePriority = (priority: string | null) => {
  if (!priority) {
    return undefined
  }
  return parseInt(priority)
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

const getEmail = (element: HTMLElement) => {
  const email = element.querySelector('email')
  if (email) {
    return {
      href: email.getAttributeNS(XLINK_NAMESPACE, 'href') ?? '',
      text: email.textContent?.trim() ?? '',
    }
  }
}
const getInstitutionDetails = (element: HTMLElement) => {
  let department = ''
  let institution = ''
  for (const node of element.querySelectorAll('institution')) {
    const content = node.textContent?.trim()
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
const getAddressLine = (element: HTMLElement, index: number) => {
  return getTrimmedTextContent(element, `addr-line:nth-of-type(${index})`) || ''
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
    tag: 'article',
    node: 'manuscript',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        doi: element.getAttribute('DOI') ?? '',
        articleType: element.getAttribute('article-type') ?? '',
        prototype: element.getAttribute('prototype') ?? '',
        primaryLanguageCode:
          element.getAttribute('primary-language-code') ?? '',
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
    tag: 'highlight-marker',
    node: 'highlight_marker',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const id = element.getAttribute('id')
      return {
        id: id,
        position: element.getAttribute('position') ?? '',
      }
    },
  },
  {
    tag: 'comment-annotation',
    node: 'comment',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        contents: element.textContent,
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
        label: label?.textContent?.trim(),
      }
    },
    getContent: (node) => {
      const element = node as HTMLElement
      return Fragment.from(schema.text(element.textContent?.trim() || ''))
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
              noteLabel: xref.textContent?.trim() || '',
            })
            break
          case 'corresp':
            corresp.push({
              correspID: rid,
              correspLabel: xref.textContent?.trim() || '',
            })
            break
          case 'aff':
            affiliations.push(rid)
            break
        }
      }

      return {
        id: element.getAttribute('id'),
        role: 'author',
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
          _id: generateID(ObjectTypes.BibliographicName),
        },
        ORCIDIdentifier: getTrimmedTextContent(
          element,
          'contrib-id[contrib-id-type="orcid"]'
        ),
        priority: parsePriority(element.getAttribute('priority')),
      }
    },
    getContent: () => {
      return Fragment.from(schema.text('_'))
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

      const { department, institution } = getInstitutionDetails(element)

      return {
        id: element.getAttribute('id'),
        institution: institution ?? '',
        department: department ?? '',
        addressLine1: getAddressLine(element, 1),
        addressLine2: getAddressLine(element, 2),
        addressLine3: getAddressLine(element, 3),
        postCode: getTrimmedTextContent(element, 'postal-code') ?? '',
        country: getTrimmedTextContent(element, 'country') ?? '',
        email: getEmail(element),
        priority: parsePriority(element.getAttribute('priority')),
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
        content.push(jatsDOMParser.parse(title, { topNode: captionTitle }))
      }

      const paragraphs = element.querySelectorAll('p')
      if (paragraphs.length) {
        const figcaption = schema.nodes.caption.create()
        for (const paragraph of paragraphs) {
          content.push(jatsDOMParser.parse(paragraph, { topNode: figcaption }))
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
        const content = jatsDOMParser.parse(p, {
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
    tag: 'sec[sec-type="bibliography"]',
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
      const authors: BibliographicName[] = []
      element.querySelectorAll('author').forEach((author) => {
        authors.push({
          _id: author.getAttribute('id') || '',
          given: author.getAttribute('given') || '',
          family: author.getAttribute('family') || '',
          literal: author.getAttribute('literal') || undefined,
          objectType: 'MPBibliographicName',
        })
      })
      const issuedEl = element.querySelector('issued')
      const issued = issuedEl
        ? {
            objectType: 'MPBibliographicDate',
            _id: issuedEl.getAttribute('id'),
            'date-parts': [[issuedEl.getAttribute('year')]],
          }
        : undefined
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
        author: authors,
        issued,
        doi: element.getAttribute('DOI'),
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
      'section/|footnotes_section/|bibliography_section/|keywords/|supplements/|author_notes/',
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

export const jatsDOMParser = new DOMParser(schema, [...marks, ...nodes])
