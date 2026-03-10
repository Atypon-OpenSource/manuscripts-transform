/*!
 * © 2023 Atypon Systems LLC
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

import { CreditVocabTerm } from '../../lib/credit-roles'
import { ManuscriptNode } from '../types'

export type CreditRole = {
  vocabTerm: CreditVocabTerm
}

export interface ContributorAttrs {
  id: string
  role: string
  correspIDs: string[]
  affiliationIDs: string[]
  footnoteIDs: string[]
  given?: string
  family?: string
  prefix?: string
  suffix?: string
  email?: string
  ORCID?: string
  isCorresponding: boolean
  priority: number
  isJointContributor: boolean
  creditRoles?: CreditRole[]
}

export interface ContributorNode extends ManuscriptNode {
  attrs: ContributorAttrs
}

export const contributor: NodeSpec = {
  content: 'inline*',
  atom: true,
  attrs: {
    id: { default: '' },
    role: { default: '' },
    correspIDs: { default: [] },
    affiliationIDs: { default: [] },
    footnoteIDs: { default: [] },
    given: { default: undefined },
    family: { default: undefined },
    prefix: { default: undefined },
    suffix: { default: undefined },
    email: { default: undefined },
    ORCID: { default: undefined },
    isCorresponding: { default: false },
    isJointContributor: { default: false },
    priority: { default: undefined },
    creditRoles: { default: [] },
    dataTracked: { default: null },
    contents: { default: '' },
  },
  group: 'block',
  toDOM: (node) => {
    const contributorNode = node as ContributorNode
    return [
      'div',
      {
        class: 'contributor',
        id: contributorNode.attrs.id,
      },
    ]
  },
}
export const isContributorNode = (
  node: ManuscriptNode
): node is ContributorNode => node.type === node.type.schema.nodes.contributor
