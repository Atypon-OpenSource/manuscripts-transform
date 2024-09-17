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
}

export interface FundingGroupNode extends ManuscriptNode {
  attrs: Attrs
}
export const fundingGroup: NodeSpec = {
  content: 'award_group*',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'fundingGroup',
        id: node.attrs.id,
      },
    ]
  },
}

export const isFundingGroupNode = (
  node: ManuscriptNode
): node is FundingGroupNode =>
  node.type === node.type.schema.nodes.funding_group
