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

export interface BoxElementAttrs {
  id: string
  labelToggle: boolean
}

export interface BoxElementNode extends ManuscriptNode {
  attrs: BoxElementAttrs
}

export const box_element: NodeSpec = {
  content: 'figcaption? section?',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
    labelToggle: { default: false },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.boxed-text',
      getAttrs: (p) => {
        const dom = p as HTMLParagraphElement

        const attrs: Partial<BoxElementAttrs> = {
          id: dom.getAttribute('id') || undefined,
        }
        return attrs
      },
    },
  ],
  toDOM: (node) => {
    const boxElementNode = node as BoxElementNode

    const attrs: { [key: string]: string } = {}

    if (boxElementNode.attrs.id) {
      attrs.id = boxElementNode.attrs.id
    }

    return [
      'div',
      {
        class: 'boxed-text',
        ...attrs,
      },
    ]
  },
}
