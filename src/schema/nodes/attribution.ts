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

export interface AttributionNode extends Node {
  attrs: Record<string, unknown>
}

export const attribution: NodeSpec = {
  content: '(text | link | highlight_marker)*',
  attrs: { dataTracked: { default: null } },
  group: 'block',
  isolating: true,
  selectable: false,
  parseDOM: [
    {
      tag: 'footer',
      context: 'blockquote_element/|pullquote_element/',
    },
  ],
  toDOM: () => ['footer', 0],
}
export const isAttributionNode = (node: Node): node is AttributionNode =>
  node.type === node.type.schema.nodes.attribution
