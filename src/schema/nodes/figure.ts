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

import { ListingAttachmentReference } from '@manuscripts/manuscripts-json-schema'
import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'
import { AttributionNode } from './attribution'

export interface FigureNode extends ManuscriptNode {
  attrs: {
    id: string
    label: string
    src: string
    contentType: string
    listingAttachment?: ListingAttachmentReference
    embedURL?: string
    originalURL?: string
    attribution?: AttributionNode
    externalFileReferences?: {
      url: string
      kind?: string
    }[]
  }
}

export const figure: NodeSpec = {
  content: 'figcaption* paragraph* attribution*',
  attrs: {
    id: { default: '' },
    label: { default: '' },
    src: { default: '' },
    contentType: { default: '' },
    listingAttachment: { default: undefined },
    embedURL: { default: undefined },
    originalURL: { default: undefined },
    attribution: { default: undefined },
    externalFileReferences: { default: undefined },
    missingImage: { default: undefined },
    position: { default: undefined },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'figure',
      context: 'figure_element/|multi_graphic_figure_element/', // TODO: match any figure?
      getAttrs: (dom) => {
        const element = dom as HTMLElement
        // const img = element.querySelector('img')

        // TODO: parse contentType?

        const iframe = element.querySelector('iframe')

        return {
          id: element.getAttribute('id'),
          // src: img ? img.getAttribute('src') : '',
          embedURL: iframe ? iframe.getAttribute('src') : undefined,
        }
      },
    },
  ],
  toDOM: (node) => {
    const figureNode = node as FigureNode

    return [
      'figure',
      {
        class: 'figure',
        id: figureNode.attrs.id,
      },
      0,
    ]
  },
}
