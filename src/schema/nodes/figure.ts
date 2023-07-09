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

import { getTrimmedAttribute } from '../../lib/utils'
import { ManuscriptNode } from '../types'

export interface FigureNode extends ManuscriptNode {
  attrs: {
    id: string
    src: string
    contentType: string
  }
}

export const figure: NodeSpec = {
  attrs: {
    id: { default: '' },
    src: { default: '' },
    contentType: { default: '' },
    position: { default: undefined },
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
          id: getTrimmedAttribute(element, 'id'),
          src: getTrimmedAttribute(element, 'src'),
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
