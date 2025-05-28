/*!
 * © 2024 Atypon Systems LLC
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
import { Fragment, Node, NodeSpec } from 'prosemirror-model'

import { getTrimmedTextContent } from '../utills'

export interface CorrespAttrs {
  id: string
  label?: string
}

export interface CorrespNode extends Node {
  attrs: CorrespAttrs
}

export const corresp: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    label: { default: undefined },
    dataTracked: { default: null },
  },
  group: 'block',
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'corresp',
        id: node.attrs.id,
      },
      0,
    ]
  },
  parseDOM: [
    {
      tag: 'corresp',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const label = element.querySelector('label')
        if (label) {
          label.remove()
        }
        return {
          id: element.getAttribute('id'),
          label: getTrimmedTextContent(label),
        }
      },
      getContent: (node, schema) => {
        const element = node as HTMLElement
        return Fragment.from(schema.text(getTrimmedTextContent(element) || ''))
      },
    },
  ],
}
export const isCorrespNode = (node: Node): node is CorrespNode =>
  node.type === node.type.schema.nodes.corresp
