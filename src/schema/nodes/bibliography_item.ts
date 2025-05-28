/*!
 * © 2022 Atypon Systems LLC
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
  BibliographicDate,
  BibliographicName,
  buildBibliographicDate,
  buildBibliographicName,
} from '@manuscripts/json-schema'
import { Node as ProsemirrorNode, NodeSpec } from 'prosemirror-model'

import { getHTMLContent, getTrimmedTextContent } from '../utills'

export interface BibliographyItemAttrs {
  id: string
  type: string
  author?: BibliographicName[]
  issued?: BibliographicDate
  'container-title'?: string
  volume?: string
  issue?: string
  supplement?: string
  page?: string
  title?: string
  literal?: string
  std?: string
  'collection-title'?: string
  edition?: string
  'publisher-place'?: string
  publisher?: string
  event?: string
  'event-place'?: string
  'event-date'?: BibliographicDate
  institution?: string
  editor?: BibliographicName[]
  locator?: string
  URL?: string
  'number-of-pages'?: string
  accessed?: BibliographicDate // date-in-citation
  DOI?: string
  comment?: string
}
export type BibliographyItemType =
  | 'article-journal' //journal
  | 'book'
  | 'chapter'
  | 'confproc'
  | 'thesis'
  | 'webpage'
  | 'other'
  | 'standard'
  | 'dataset'
  | 'preprint'

const publicationTypeToPM: Record<string, string> = {
  journal: 'article-journal',
  web: 'webpage',
  data: 'dataset',
  preprint: 'article-journal',
}

export interface BibliographyItemNode extends ProsemirrorNode {
  attrs: BibliographyItemAttrs
}

const parseRefLiteral = (element: Element) => {
  const mixedCitation = element.querySelector('mixed-citation')
  const hasDirectTextNodeWithLetters = Array.from(
    mixedCitation?.childNodes ?? []
  ).some(
    (node) =>
      node.nodeType === Node.TEXT_NODE && node.textContent?.match(/[A-Za-z]+/g)
  )

  if (hasDirectTextNodeWithLetters) {
    return getTrimmedTextContent(mixedCitation)
  }
}
const parseRefPages = (element: Element) => {
  const fpage = getTrimmedTextContent(element, 'fpage')
  const lpage = getTrimmedTextContent(element, 'lpage')
  if (fpage) {
    return lpage ? `${fpage}-${lpage}` : fpage
  }
}

const parseRef = (element: Element) => {
  return {
    id: element.id,
    type: choosePublicationType(element),
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
    author: getNameContent(
      element,
      'person-group[person-group-type="author"] > *'
    ),
    editor: getNameContent(
      element,
      'person-group[person-group-type="editor"] > *'
    ),
    literal: parseRefLiteral(element),
    accessed: getDateContent(element, 'date-in-citation'),
    'event-date': getDateContent(element, 'conf-date'),
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
    page: parseRefPages(element),
  }
}

const choosePublicationType = (element: Element) => {
  const citationElement = element.querySelector(
    'element-citation, mixed-citation'
  )
  const type = citationElement?.getAttribute('publication-type')
  return type ? publicationTypeToPM[type] ?? type : 'article-journal'
}

const getNameContent = (element: Element, query: string) => {
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

const getDateContent = (element: Element, query: string) => {
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

export const bibliographyItem: NodeSpec = {
  // this is to help the prosemirror decoration to reach HTML of this node
  content: 'inline{0}',
  attrs: {
    id: { default: '' },
    type: { default: undefined },
    author: { default: undefined },
    DOI: { default: undefined },
    issued: { default: undefined },
    'container-title': { default: undefined },
    volume: { default: undefined },
    issue: { default: undefined },
    supplement: { default: undefined },
    page: { default: undefined },
    title: { default: undefined },
    literal: { default: undefined },
    std: { default: undefined },
    'collection-title': { default: undefined },
    edition: { default: undefined },
    publisher: { default: undefined }, //publisher-name
    'publisher-place': { default: undefined }, //publisher-loc
    event: { default: undefined }, //conf-name
    'event-place': { default: undefined }, //conf-loc
    'event-date': { default: undefined }, //conf-date
    institution: { default: undefined },
    editor: { default: undefined },
    locator: { default: undefined },
    'number-of-pages': { default: undefined }, //size @unit=pages
    pubIDs: { default: undefined },
    accessed: { default: undefined },
    URL: { default: undefined },
    comment: { default: undefined },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'ref',
      context: 'bibliography_element/',
      node: 'bibliography_item',
      getAttrs: (node) => parseRef(node as Element),
    },
  ],
}

export const isBibliographyItemNode = (
  node: ProsemirrorNode
): node is BibliographyItemNode =>
  node.type === node.type.schema.nodes.bibliography_item
