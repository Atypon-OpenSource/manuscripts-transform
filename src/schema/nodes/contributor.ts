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
import { BibliographicName, ObjectTypes } from '@manuscripts/json-schema'
import { Fragment, Node, NodeSpec } from 'prosemirror-model'

import { CreditVocabTerm } from '../../lib/credit-roles'
import { getCRediTRoleRole, getTrimmedTextContent } from '../utills'

const parsePriority = (priority: string | null) => {
  if (!priority) {
    return undefined
  }
  return parseInt(priority)
}

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
  degreeContribution?: string
}

export interface ContributorAttrs {
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

export interface ContributorNode extends Node {
  attrs: ContributorAttrs
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
  parseDOM: [
    {
      tag: 'contrib[contrib-type="author"]',
      node: 'contributor',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const footnote: ContributorFootnote[] = []
        const affiliations: string[] = []
        const corresp: ContributorCorresp[] = []

        const xrefs = element.querySelectorAll('xref')
        for (const xref of xrefs) {
          const rid = xref.getAttribute('rid')
          const type = xref.getAttribute('ref-type')
          if (!rid) {
            continue
          }
          switch (type) {
            case 'fn':
              footnote.push({
                noteID: rid,
                noteLabel: getTrimmedTextContent(xref) || '',
              })
              break
            case 'corresp':
              corresp.push({
                correspID: rid,
                correspLabel: getTrimmedTextContent(xref) || '',
              })
              break
            case 'aff':
              affiliations.push(rid)
              break
          }
        }

        return {
          id: element.getAttribute('id') || undefined,
          role: getTrimmedTextContent(element, 'role'),
          affiliations,
          corresp,
          footnote,
          isCorresponding: element.getAttribute('corresp')
            ? element.getAttribute('corresp') === 'yes'
            : undefined,
          bibliographicName: {
            given: getTrimmedTextContent(element, 'name > given-names'),
            family: getTrimmedTextContent(element, 'name > surname'),
            ObjectType: ObjectTypes.BibliographicName,
          },
          ORCIDIdentifier: getTrimmedTextContent(
            element,
            'contrib-id[contrib-id-type="orcid"]'
          ),
          CRediTRoles: getCRediTRoleRole(element),
          priority: parsePriority(element.getAttribute('priority')),
          email: getTrimmedTextContent(element, 'email') || '',
          prefix: getTrimmedTextContent(element, 'prefix'),
        }
      },
      getContent: (_node, schema) => {
        return Fragment.from(schema.text('_'))
      },
    },
  ],
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
export const isContributorNode = (node: Node): node is ContributorNode =>
  node.type === node.type.schema.nodes.contributor
