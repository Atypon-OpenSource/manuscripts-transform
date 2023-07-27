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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  type: string
  author?: string[]
  issued?: string
  containerTitle?: string
  doi?: string
  volume?: string
  issue?: string
  supplement?: string
  page?: string
  title?: string
  literal?: string
}

export interface BibliographyItemNode extends ManuscriptNode {
  attrs: Attrs
}

export const bibliographyItem: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    type: { default: undefined },
    author: { default: undefined },
    issued: { default: undefined },
    containerTitle: { default: undefined },
    doi: { default: undefined },
    volume: { default: undefined },
    issue: { default: undefined },
    supplement: { default: undefined },
    page: { default: undefined },
    title: { default: undefined },
    literal: { default: undefined },
    paragraphStyle: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'div.csl-entry',
      getAttrs: (p) => {
        const dom = p as HTMLDivElement

        return {
          id: dom.getAttribute('id'),
          type: dom.getAttribute('data-type'),
          author: dom.getAttribute('data-author') || undefined,
          issued: dom.getAttribute('data-issued') || undefined,
          containerTitle: dom.getAttribute('data-container-title') || undefined,
          doi: dom.getAttribute('data-doi') || undefined,
          volume: dom.getAttribute('data-volume') || undefined,
          issue: dom.getAttribute('data-issue') || undefined,
          supplement: dom.getAttribute('data-supplement') || undefined,
          page: dom.getAttribute('data-page') || undefined,
          title: dom.getAttribute('data-title') || undefined,
          literal: dom.getAttribute('data-literal') || undefined,
        }
      },
    },
  ],
  toDOM: (node) => {
    const bibliographyItemNode = node as BibliographyItemNode

    const attrs: { [key: string]: string } = {}

    attrs.class = 'csl-entry'

    const {
      id,
      type,
      author,
      issued,
      containerTitle,
      doi,
      volume,
      issue,
      supplement,
      page,
      title,
      literal,
    } = bibliographyItemNode.attrs

    attrs.id = id

    if (type) {
      attrs['data-type'] = type
    }

    if (author) {
      attrs['data-author'] = author.join(',')
    }

    if (issued) {
      attrs['data-issued'] = issued
    }

    if (containerTitle) {
      attrs['data-container-title'] = containerTitle
    }

    if (doi) {
      attrs['data-doi'] = doi
    }

    if (volume) {
      attrs['data-volume'] = volume
    }

    if (issue) {
      attrs['data-issue'] = issue
    }

    if (supplement) {
      attrs['data-supplement'] = supplement
    }

    if (page) {
      attrs['data-page'] = page
    }

    if (title) {
      attrs['data-title'] = title
    }

    if (literal) {
      attrs['data-literal'] = literal
    }

    return ['div', attrs, 0]
  },
}
