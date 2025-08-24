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

export interface SubtitlesAttrs {
  id: string
}

export interface SubtitlesNode extends ManuscriptNode {
  attrs: SubtitlesAttrs
}

export const subtitles: NodeSpec = {
  content: 'subtitle*',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block sections',
  selectable: false,
  toDOM: (node) => {
    const subtitlesNode = node as SubtitlesNode
    return [
      'section',
      {
        id: subtitlesNode.attrs.id,
        class: 'subtitles',
      },
      0,
    ]
  },
}

export const isSubtitlesNode = (node: ManuscriptNode): node is SubtitlesNode =>
  node.type === node.type.schema.nodes.subtitles
