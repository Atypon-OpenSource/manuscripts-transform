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

interface Attrs {
  id: string
  placeholder: string
}

export interface ParagraphNode extends ManuscriptNode {
  attrs: Attrs
}

export const paragraph: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    placeholder: { default: '' }, // TODO: 'List item' if inside a list
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'p',
      getAttrs: (p) => {
        const dom = p as HTMLParagraphElement

        const attrs: Partial<Attrs> = {
          id: dom.getAttribute('id') || undefined,
        }

        const placeholder = dom.getAttribute('data-placeholder-text')

        if (placeholder) {
          attrs.placeholder = placeholder
        }

        return attrs
      },
    },
  ],
  toDOM: (node) => {
    const paragraphNode = node as ParagraphNode

    const attrs: { [key: string]: string } = {}

    if (paragraphNode.attrs.id) {
      attrs.id = paragraphNode.attrs.id
    }

    if (paragraphNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = paragraphNode.attrs.placeholder
    }

    return ['p', attrs, 0]
  },
}

export const isParagraphNode = (node: ManuscriptNode): node is ParagraphNode =>
  node.type === node.type.schema.nodes.paragraph
