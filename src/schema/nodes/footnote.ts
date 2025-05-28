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

type Kind = 'footnote' | 'endnote'

export interface FootnoteAttrs {
  id: string
  kind: Kind
  placeholder?: string
}

export interface FootnoteNode extends Node {
  attrs: FootnoteAttrs
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

        const attrs: Partial<FootnoteAttrs> = {
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
    {
      tag: 'fn[fn-type]', // all supported fn-types should be moved out by the time we parse into prosemirror
      context: 'author_notes/',
      ignore: true,
    },
    {
      tag: 'fn:not([fn-type])',
      context: 'author_notes/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          kind: 'footnote',
        }
      },
    },
    {
      tag: 'fn',
      context: 'footnotes_element/|table_element_footer/',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
          kind: 'footnote', // TODO: 'endnote' depending on position or attribute?
        }
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

export const isFootnoteNode = (node: Node): node is FootnoteNode =>
  node.type === node.type.schema.nodes.footnote
