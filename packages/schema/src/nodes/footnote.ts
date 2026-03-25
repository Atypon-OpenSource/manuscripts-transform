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

type Kind = 'footnote' | 'endnote'

// const placeholderText: { [key in Kind]: string } = {
//   endnote: 'Endnote',
//   footnote: 'Footnote',
// }

interface Attrs {
  id: string
  kind: Kind
  placeholder?: string
}

export interface FootnoteNode extends ManuscriptNode {
  attrs: Attrs
}

export const footnote: NodeSpec = {
  group: 'block',
  content: 'paragraph+',
  attrs: {
    id: { default: '' },
    kind: { default: 'footnote' },
    placeholder: { default: '' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'div.footnote-text', // TODO: footnote-contents wrapper?
      getAttrs: (p) => {
        const dom = p as HTMLDivElement

        const attrs: Partial<Attrs> = {
          id: dom.getAttribute('id') || undefined,
          kind: (dom.getAttribute('data-kind') || 'footnote') as Kind,
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
    const footnoteNode = node as FootnoteNode

    // TODO: footnote-contents wrapper?

    // TODO: default kind
    const { kind, placeholder, id } = footnoteNode.attrs

    const attrs: Record<string, string> = { class: 'footnote-text', id: '' }

    if (kind) {
      attrs['data-kind'] = kind
    }

    if (id) {
      attrs.id = id
    }

    if (placeholder) {
      attrs['data-placeholder-text'] = placeholder
    }

    return ['div', attrs, 0]
  },
}

export const isFootnoteNode = (node: ManuscriptNode): node is FootnoteNode =>
  node.type === node.type.schema.nodes.footnote
