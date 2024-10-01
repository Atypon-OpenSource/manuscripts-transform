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

import { ManuscriptNode, ManuscriptNodeSpec } from '../types'

interface Attrs {
  id: string
  kind?: string
  paragraphStyle?: string
}

export interface FootnotesElementNode extends ManuscriptNode {
  attrs: Attrs
}

interface FootnotesElementNodeSpec extends ManuscriptNodeSpec {
  isWrapper: boolean
}

export const footnotesElement: FootnotesElementNodeSpec = {
  name: 'Footnotes',
  isWrapper: true,
  attrs: {
    id: { default: '' },
    kind: { default: 'footnote' },
    paragraphStyle: { default: '' },
    dataTracked: { default: null },
  },
  content: 'footnote*',
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.footnotes', // TODO: endnotes?
      getAttrs: (p) => {
        const dom = p as HTMLDivElement

        return {
          kind: dom.getAttribute('data-kind') || 'footnote',
          // paragraphStyle: dom.getAttribute('data-paragraph-style'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const footnotesElementNode = node as FootnotesElementNode

    const { id, kind, paragraphStyle } = footnotesElementNode.attrs

    const attrs: Record<string, string> = { class: 'footnotes', id }

    if (kind) {
      attrs['data-kind'] = kind
    }

    if (paragraphStyle) {
      attrs['paragraphStyle'] = paragraphStyle
    }

    return ['div', attrs, 0]
  },
}

export const isFootnotesElementNode = (
  node: ManuscriptNode
): node is FootnotesElementNode =>
  node.type === node.type.schema.nodes.footnotes_element
