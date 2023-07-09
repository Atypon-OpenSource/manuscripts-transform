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

import { getTrimmedAttribute } from '../../lib/utils'
import { ManuscriptNode } from '../types'

interface Attrs {
  rid: string
  contents: string
}

export interface InlineFootnoteNode extends ManuscriptNode {
  attrs: Attrs
}

export const inlineFootnote: NodeSpec = {
  attrs: {
    rid: { default: '' },
    contents: { default: '' },
    dataTracked: { default: null },
  },
  atom: true,
  inline: true,
  draggable: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'span.footnote', // TODO: span.endnote?
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement

        return {
          rid: getTrimmedAttribute(dom, 'data-reference-id'),
          contents: dom.textContent,
        }
      },
    },
  ],
  toDOM: (node) => {
    const inlineFootnoteNode = node as InlineFootnoteNode
    const dom = document.createElement('span')
    dom.className = 'footnote'
    dom.setAttribute('data-reference-id', inlineFootnoteNode.attrs.rid)
    dom.textContent = inlineFootnoteNode.attrs.contents

    return dom
  },
}

export const isInlineFootnoteNode = (
  node: ManuscriptNode
): node is InlineFootnoteNode =>
  node.type === node.type.schema.nodes.inline_footnote
