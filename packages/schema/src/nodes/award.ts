/*!
 * © 2024 Atypon Systems LLC
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
  recipient: string
  code: string
  source: string
}

export interface AwardNode extends ManuscriptNode {
  attrs: Attrs
}

export const award: NodeSpec = {
  attrs: {
    id: { default: '' },
    recipient: { default: undefined },
    code: { default: undefined },
    source: { default: undefined },
    dataTracked: { default: null },
  },
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'award',
        id: node.attrs.id,
      },
    ]
  },
}

export const isAwardNode = (node: ManuscriptNode): node is AwardNode =>
  node.type === node.type.schema.nodes.award
