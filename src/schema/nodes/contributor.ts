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
import { BibliographicName } from '@manuscripts/json-schema'
import { NodeSpec } from 'prosemirror-model'

import { CreditVocabTerm } from '../../lib/credit-roles'
import { ManuscriptNode } from '../types'

export type ContributorCorresp = {
  correspID: string
  correspLabel: string
}
export type ContributorFootnote = {
  noteID: string
  noteLabel: string
}

export type CRediTRole = {
  vocabTerm: CreditVocabTerm
}

interface Attrs {
  id: string
  role: string
  corresp: ContributorCorresp[]
  affiliations: string[]
  bibliographicName: BibliographicName
  userID: string
  email: string
  invitationID: string
  isCorresponding: boolean
  ORCIDIdentifier: string
  priority: number
  isJointContributor: boolean
  footnote: ContributorFootnote[]
  prefix: string
  CRediTRoles?: CRediTRole[]
}

export interface ContributorNode extends ManuscriptNode {
  attrs: Attrs
}

export const contributor: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    role: { default: '' },
    email: { default: '' },
    affiliations: { default: [] },
    footnote: { default: undefined },
    corresp: { default: undefined },
    bibliographicName: { default: {} },
    userID: { default: undefined },
    invitationID: { default: undefined },
    isCorresponding: { default: undefined },
    isJointContributor: { default: undefined },
    ORCIDIdentifier: { default: undefined },
    priority: { default: undefined },
    CRediTRoles: { default: [] },
    dataTracked: { default: null },
    contents: { default: '' },
    prefix: { default: '' },
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
