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
  rids: string[]
}

export interface InlineFootnoteNode extends ManuscriptNode {
  attrs: Attrs
}

export const inlineFootnote: NodeSpec = {
  attrs: {
    id: { default: '' },
    rids: { default: [] },
    dataTracked: { default: null },
  },
  atom: true,
  inline: true,
  draggable: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'span.footnote-marker',
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement
        return {
          id: dom.id,
          rids: dom.getAttribute('data-reference-id')?.split(/\s+/) || [],
        }
      },
    },
  ],
  toDOM: (node) => {
    const footnoteNode = node as InlineFootnoteNode
    const dom = document.createElement('span')
    dom.id = footnoteNode.attrs.id
    dom.className = 'footnote-marker'
    dom.setAttribute('data-reference-id', footnoteNode.attrs.rids.join(' '))

    return dom
  },
}

export const isInlineFootnoteNode = (
  node: ManuscriptNode
): node is InlineFootnoteNode =>
  node.type === node.type.schema.nodes.inline_footnote
