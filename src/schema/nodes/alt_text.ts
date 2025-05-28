/*!
 * © 2025 Atypon Systems LLC
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

import type { Node, NodeSpec } from 'prosemirror-model'

export interface AltTextAttrs {
  id: string
}

export interface AltTextNode extends Node {
  attrs: AltTextAttrs
}

export const altText: NodeSpec = {
  content: 'text*',
  attrs: {
    id: { default: '' },
  },
  parseDOM: [
    { tag: 'div' },
    {
      tag: 'alt-text',
    },
  ],
  toDOM: () => ['div', 0],
}

export const isAltTextNode = (node: Node): node is AltTextNode =>
  node.type === node.type.schema.nodes.alt_text
