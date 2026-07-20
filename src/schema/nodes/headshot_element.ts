/*!
 * © 2026 Atypon Systems LLC
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

export interface HeadshotElementNode extends ManuscriptNode {
  attrs: {
    id: string
    type: string
  }
}

export const headshotElement: NodeSpec = {
  content: 'headshot_image caption_title caption alt_text long_desc',
  attrs: {
    id: { default: '' },
    type: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'headshot_element',
        id: node.attrs.id,
      },
    ]
  },
}

export const isHeadshotElementNode = (
  node: ManuscriptNode
): node is HeadshotElementNode =>
  node.type === node.type.schema.nodes.headshot_element
