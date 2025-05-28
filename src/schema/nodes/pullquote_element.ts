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

export interface PullquoteElementAttrs {
  id: string
  placeholder: string
}

export interface PullquoteElementNode extends Node {
  attrs: PullquoteElementAttrs
}

export const pullquoteElement: NodeSpec = {
  content: 'quote_image? paragraph+ attribution',
  attrs: {
    id: { default: '' },
    placeholder: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'aside.pullquote',
      getAttrs: (aside) => {
        const dom = aside as HTMLElement

        const attrs: Partial<PullquoteElementAttrs> = {
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
      tag: 'disp-quote',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const pullquoteElementNode = node as PullquoteElementNode

    const attrs: { [key: string]: string } = {}

    if (pullquoteElementNode.attrs.id) {
      attrs.id = pullquoteElementNode.attrs.id
    }

    attrs.class = 'pullquote'

    attrs['data-object-type'] = ObjectTypes.QuoteElement

    if (pullquoteElementNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = pullquoteElementNode.attrs.placeholder
    }

    return ['aside', attrs, 0]
  },
}

export const isPullquoteElement = (node: Node): node is PullquoteElementNode =>
  node.type === node.type.schema.nodes.pullquote_element
