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
import { Fragment, Node, NodeSpec } from 'prosemirror-model'

import { getTrimmedTextContent } from '../utills'
interface Email {
  href: string
  text: string
}

const getAddressLine = (element: HTMLElement, index: number) => {
  return getTrimmedTextContent(element, `addr-line:nth-of-type(${index})`) || ''
}

const getInstitutionDetails = (element: HTMLElement) => {
  let department = ''
  let institution = ''
  for (const node of element.querySelectorAll('institution')) {
    const content = getTrimmedTextContent(node)
    if (!content) {
      continue
    }
    const type = node.getAttribute('content-type')
    if (type === 'dept') {
      department = content
    } else {
      institution = content
    }
  }
  return { department, institution }
}
export interface AffiliationAttrs {
  id: string
  institution: string
  department: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  postCode: string
  country: string
  county: string
  city: string
  email: Email
  priority: number
}
const parsePriority = (priority: string | null) => {
  if (!priority) {
    return undefined
  }
  return parseInt(priority)
}

export interface AffiliationNode extends Node {
  attrs: AffiliationAttrs
}
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const getEmail = (element: HTMLElement) => {
  const email = element.querySelector('email')
  if (email) {
    return {
      href: email.getAttributeNS(XLINK_NAMESPACE, 'href') ?? '',
      text: getTrimmedTextContent(email) ?? '',
    }
  }
}
export const affiliation: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    institution: { default: '' },
    department: { default: '' },
    addressLine1: { default: '' },
    addressLine2: { default: '' },
    addressLine3: { default: '' },
    postCode: { default: '' },
    country: { default: '' },
    county: { default: '' },
    city: { default: '' },
    priority: { default: undefined },
    email: { default: undefined },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'div.affiliation',
      getAttrs: (node) => {
        const dom = node as HTMLSpanElement
        return {
          id: dom.getAttribute('id'),
        }
      },
    },
    {
      tag: 'aff',
      context: 'affiliations/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const { department, institution } = getInstitutionDetails(element)
        return {
          id: element.getAttribute('id'),
          institution: institution ?? '',
          department: department ?? '',
          addressLine1: getAddressLine(element, 1),
          addressLine2: getAddressLine(element, 2),
          addressLine3: getAddressLine(element, 3),
          postCode: getTrimmedTextContent(element, 'postal-code') ?? '',
          country: getTrimmedTextContent(element, 'country') ?? '',
          email: getEmail(element),
          priority: parsePriority(element.getAttribute('priority')),
        }
      },
      getContent: (_node, schema) => {
        return Fragment.from(schema.text('_'))
      },
    },
  ],
  toDOM: (node) => {
    const affiliationNode = node as AffiliationNode
    return [
      'div',
      {
        class: 'affiliation',
        id: affiliationNode.attrs.id,
      },
    ]
  },
}

export const isAffiliationNode = (node: Node): node is AffiliationNode =>
  node.type === node.type.schema.nodes.affiliation
