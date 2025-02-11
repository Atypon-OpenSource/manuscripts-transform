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

import { Fragment } from 'prosemirror-model'

import { trimTextContent } from '../../../lib/utils'
import { ManuscriptNode, NodeRule } from '../../../schema'
import { JatsParser } from './JatsParser'

export class AffiliationsParser extends JatsParser {
  private readonly tag = 'article-meta > contrib-group > aff'

  parse(): ManuscriptNode | undefined {
    const elements = this.doc.querySelectorAll(this.tag)
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
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'aff',
        node: 'affiliation',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const { department, institution } =
            this.getInstitutionDetails(element)
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
            priority: JatsParser.parsePriority(
              element.getAttribute('priority')
            ),
          }
        },
        getContent: () => {
          return Fragment.from(this.schema.text('_'))
        },
      },
    ]
  }
  private getAddressLine = (element: HTMLElement, index: number) => {
    return trimTextContent(element, `addr-line:nth-of-type(${index})`) || ''
  }
  private getEmail = (element: HTMLElement) => {
    const email = element.querySelector('email')
    if (email) {
      return {
        href: email.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'href') ?? '',
        text: trimTextContent(email) ?? '',
      }
    }
  }
  private getInstitutionDetails = (element: HTMLElement) => {
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
