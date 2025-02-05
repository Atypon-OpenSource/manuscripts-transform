/*!
 * © 2025 Atypon Systems LLC
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

import { DOMParser, Fragment } from 'prosemirror-model'

import { trimTextContent } from '../../lib/utils'
import { ManuscriptNode, NodeRule } from '../../schema'
import { JatsParser } from './JatsParser'

export class AffiliationsParser extends JatsParser {
  parser: DOMParser

  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }
  parse(elements: Element[]): ManuscriptNode | undefined {
    if (!elements.length) {
      return
    }
    const affiliations = this.createElement('affiliations')
    for (const element of elements) {
      affiliations.appendChild(element)
    }
    return this.parser.parse(affiliations, {
      topNode: this.schema.nodes.affiliations.create(),
    })
  }
  nodes: NodeRule[] = [
    {
      tag: 'aff',
      node: 'affiliation',
      context: 'affiliations/',
      getAttrs: (node) => {
        const element = node as HTMLElement

        const { department, institution } = this.getInstitutionDetails(element)

        return {
          id: element.getAttribute('id'),
          institution: institution ?? '',
          department: department ?? '',
          addressLine1: this.getAddressLine(element, 1),
          addressLine2: this.getAddressLine(element, 2),
          addressLine3: this.getAddressLine(element, 3),
          postCode: trimTextContent(element, 'postal-code') ?? '',
          country: trimTextContent(element, 'country') ?? '',
          email: this.getEmail(element),
          priority: this.parsePriority(element.getAttribute('priority')),
        }
      },
      getContent: () => {
        return Fragment.from(this.schema.text('_'))
      },
    },
  ]
  private getAddressLine = (element: HTMLElement, index: number) => {
    return trimTextContent(element, `addr-line:nth-of-type(${index})`) || ''
  }
  protected getEmail = (element: HTMLElement) => {
    const email = element.querySelector('email')
    if (email) {
      return {
        href: email.getAttributeNS(this.XLINK_NAMESPACE, 'href') ?? '',
        text: trimTextContent(email) ?? '',
      }
    }
  }
  protected getInstitutionDetails = (element: HTMLElement) => {
    let department = ''
    let institution = ''
    for (const node of element.querySelectorAll('institution')) {
      const content = trimTextContent(node)
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
}
