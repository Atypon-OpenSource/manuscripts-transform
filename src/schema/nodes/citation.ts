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
  rid: string
  contents: string
  embeddedCitationItems: { id: string; bibliographyItem: string }[]
}

export interface CitationNode extends ManuscriptNode {
  attrs: Attrs
}

export const citation: NodeSpec = {
  inline: true,
  group: 'inline',
  draggable: true,
  atom: true,
  attrs: {
    rid: { default: '' },
    contents: { default: '' },
    selectedText: { default: '' },
    dataTracked: { default: null },
    embeddedCitationItems: { default: null },
  },
  parseDOM: [
    {
      tag: 'span.citation[data-reference-id]',
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement

        const attr: { [key: string]: string | null } = {
          rid: dom.getAttribute('data-reference-id'),
          contents: dom.innerHTML,
        }

        const embeddedCitation = JSON.parse(
          dom.getAttribute('data-reference-embedded-citation') || 'null'
        )
        if (embeddedCitation) {
          attr['embeddedCitationItems'] = embeddedCitation
        }

        return attr
      },
    },
  ],
  toDOM: (node) => {
    const citationNode = node as CitationNode

    const dom = document.createElement('span')
    dom.className = 'citation'
    dom.setAttribute('data-reference-id', citationNode.attrs.rid)

    if (citationNode.attrs.embeddedCitationItems) {
      dom.setAttribute(
        'data-reference-embedded-citation',
        JSON.stringify(citationNode.attrs.embeddedCitationItems)
      )
    }

    dom.innerHTML = citationNode.attrs.contents

    return dom
  },
}

export const isCitationNode = (node: ManuscriptNode): node is CitationNode =>
  node.type === node.type.schema.nodes.citation
