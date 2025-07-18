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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

export interface SubtitleAttrs {
  id: string
}

export interface SubtitleNode extends ManuscriptNode {
  attrs: SubtitleAttrs
}

export const subtitle: NodeSpec = {
  content: '(text | highlight_marker)*',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  toDOM: () => ['div', 0],
}

export const isSubtitleNode = (node: ManuscriptNode): node is SubtitleNode =>
  node.type === node.type.schema.nodes.subtitle
