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

import { ManuscriptNode } from 'migration-base'
import { NodeSpec } from 'prosemirror-model'

interface Attrs {
  id: string
  recipient: string
  awardIDs: string[]
  fundingSource: string
}

export interface AwardGroupNode extends ManuscriptNode {
  attrs: Attrs
}

export const awardGroup: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    recipient: { default: undefined },
    awardIDs: { default: [] },
    fundingSource: { default: [] },
    dataTracked: { default: null },
  },
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'awardGroup',
        id: node.attrs.id,
      },
    ]
  },
}

export const isAwardGroupNode = (
  node: ManuscriptNode
): node is AwardGroupNode => node.type === node.type.schema.nodes.award_group
