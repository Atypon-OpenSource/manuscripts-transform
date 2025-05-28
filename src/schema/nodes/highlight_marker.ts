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

export interface HighlightMarkerAttrs {
  //TODO rename to rid
  id: string
  position: string
}

export interface HighlightMarkerNode extends Node {
  attrs: HighlightMarkerAttrs
}

export const highlightMarker: NodeSpec = {
  inline: true,
  group: 'inline',
  // draggable: true,
  atom: true,
  attrs: {
    id: { default: '' },
    position: { default: '' },
  },
  parseDOM: [
    {
      tag: 'span.highlight-marker',
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement

        return {
          id: dom.getAttribute('id'),
          position: dom.getAttribute('data-position'),
        }
      },
    },
    {
      tag: 'highlight-marker',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.id,
          position: element.getAttribute('position'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const highlightMarkerNode = node as HighlightMarkerNode

    const dom = document.createElement('span')
    dom.className = 'highlight-marker'
    dom.setAttribute('id', highlightMarkerNode.attrs.id)
    dom.setAttribute('data-position', highlightMarkerNode.attrs.position)

    return dom
  },
}

export const isHighlightMarkerNode = (
  node: Node
): node is HighlightMarkerNode =>
  node.type === node.type.schema.nodes.highlight_marker
