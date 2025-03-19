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

export interface FigureAttrs {
  id: string
  src: string
  type: string
  altText: string
  longDesc: string
}

export interface FigureNode extends ManuscriptNode {
  attrs: FigureAttrs
}

export const figure: NodeSpec = {
  attrs: {
    id: { default: '' },
    src: { default: '' },
    type: { default: '' },
    altText: { default: '' },
    longDesc: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'figure',
      context: 'figure_element/',
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
    const figureNode = node as FigureNode

    return [
      'figure',
      {
        class: 'figure',
        id: figureNode.attrs.id,
      },
    ]
  },
}
