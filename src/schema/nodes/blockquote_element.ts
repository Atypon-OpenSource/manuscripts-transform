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

import { ObjectTypes } from '@manuscripts/json-schema'
import { Node, NodeSpec } from 'prosemirror-model'

export interface BlockquoteElementAttrs {
  id: string
  placeholder: string
}

export interface BlockquoteElementNode extends Node {
  attrs: BlockquoteElementAttrs
}

export const blockquoteElement: NodeSpec = {
  content: 'paragraph+ attribution',
  attrs: {
    id: { default: '' },
    placeholder: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'blockquote',
      getAttrs: (blockquote) => {
        const dom = blockquote as HTMLQuoteElement

        const attrs: Partial<BlockquoteElementAttrs> = {
          id: dom.getAttribute('id') || undefined,
        }

        const placeholder = dom.getAttribute('data-placeholder-text')

        if (placeholder) {
          attrs.placeholder = placeholder
        }

        return attrs
      },
    },
    {
      tag: 'disp-quote[content-type=quote]',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const blockquoteElementNode = node as BlockquoteElementNode

    const attrs: { [key: string]: string } = {}

    if (blockquoteElementNode.attrs.id) {
      attrs.id = blockquoteElementNode.attrs.id
    }

    attrs['data-object-type'] = ObjectTypes.QuoteElement

    if (blockquoteElementNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = blockquoteElementNode.attrs.placeholder
    }

    return ['blockquote', attrs, 0]
  },
}

export const isBlockquoteElement = (
  node: Node
): node is BlockquoteElementNode =>
  node.type === node.type.schema.nodes.blockquote_element
