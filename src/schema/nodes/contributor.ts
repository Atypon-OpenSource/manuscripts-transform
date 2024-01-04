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
import { Affiliation, BibliographicName } from '@manuscripts/json-schema'
import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  role: string
  affiliations: Affiliation[]
  bibliographicName: BibliographicName
  userID: string
  email: string
  invitationID: string
  isCorresponding: boolean
  ORCIDIdentifier: string
  priority: number
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
    ORCIDIdentifier: { default: undefined },
    priority: { default: undefined },
    dataTracked: { default: null },
    contents: { default: '' },
  },
  group: 'block element',
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
