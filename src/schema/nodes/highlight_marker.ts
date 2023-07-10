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
  //target id
  tid: string
  position: string
  text: string
}

export interface HighlightMarkerNode extends ManuscriptNode {
  attrs: Attrs
}

export const highlightMarker: NodeSpec = {
  inline: true,
  group: 'inline',
  // draggable: true,
  atom: true,
  attrs: {
    id: { default: '' },
    tid: { default: '' },
    position: { default: '' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'span.highlight-marker',
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement

        return {
          id: dom.getAttribute('id'),
          tid: dom.getAttribute('data-target-id'),
          position: dom.getAttribute('data-position'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const highlightMarkerNode = node as HighlightMarkerNode

    const dom = document.createElement('span')
    dom.className = 'highlight-marker'
    dom.setAttribute('id', highlightMarkerNode.attrs.id)
    dom.setAttribute('data-target-id', highlightMarkerNode.attrs.tid)
    dom.setAttribute('data-position', highlightMarkerNode.attrs.position)

    return dom
  },
}

export const isHighlightMarkerNode = (
  node: ManuscriptNode
): node is HighlightMarkerNode =>
  node.type === node.type.schema.nodes.highlight_marker
