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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

export interface QuoteImageAttrs {
  id: string
  src: string
  type: string
}

export interface QuoteImageNode extends ManuscriptNode {
  attrs: QuoteImageAttrs
}

export const quoteImage: NodeSpec = {
  attrs: {
    id: { default: '' },
    src: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'figure',
      context: 'pullquote_element/',
      getAttrs: (dom) => {
        const element = dom as HTMLElement

        return {
          id: element.getAttribute('id'),
          src: element.getAttribute('src'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const imageNode = node as QuoteImageNode

    return [
      'figure',
      {
        class: 'pullquote-figure',
        id: imageNode.attrs.id,
      },
    ]
  },
}
