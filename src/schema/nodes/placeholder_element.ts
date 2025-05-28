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

import { Node, NodeSpec } from 'prosemirror-model'

export interface PlaceholderElementAttrs {
  id: string
}

export interface PlaceholderElementNode extends Node {
  attrs: PlaceholderElementAttrs
}

export const placeholderElement: NodeSpec = {
  atom: true,
  selectable: false,
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  parseDOM: [
    {
      tag: 'div.placeholder-element',
      getAttrs: (p) => {
        const dom = p as HTMLDivElement

        return {
          id: dom.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const placeholderElementNode = node as PlaceholderElementNode

    return [
      'div',
      {
        class: 'placeholder-element',
        id: placeholderElementNode.attrs.id,
      },
    ]
  },
}

export const isPlaceholderElementNode = (
  node: Node
): node is PlaceholderElementNode =>
  node.type === node.type.schema.nodes.placeholder_element
