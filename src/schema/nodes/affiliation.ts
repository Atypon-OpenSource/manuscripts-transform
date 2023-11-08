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

import { ManuscriptNode } from '../types'

interface Email {
  href: string
  text: string
}

interface Attrs {
  id: string
  institution: string
  department: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  postCode: string
  country: string
  email: Email
}

export interface AffiliationNode extends ManuscriptNode {
  attrs: Attrs
}

export const affiliation: NodeSpec = {
  attrs: {
    id: { default: '' },
    institution: { default: '' },
    department: { default: '' },
    addressLine1: { default: '' },
    addressLine2: { default: '' },
    addressLine3: { default: '' },
    postCode: { default: '' },
    country: { default: '' },
    email: {
      default: {
        href: undefined,
        text: undefined,
      },
    },
  },
  group: 'block element',
  toDOM: () => ['span'],
}

export const isAffiliationNode = (
  node: ManuscriptNode
): node is AffiliationNode => node.type === node.type.schema.nodes.affiliation
