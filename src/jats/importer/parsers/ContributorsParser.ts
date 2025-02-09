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

import { ObjectTypes } from '@manuscripts/json-schema'
import { Fragment } from 'prosemirror-model'

import { trimTextContent } from '../../../lib/utils'
import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  NodeRule,
} from '../../../schema'
import { JatsParser } from './JatsParser'

export class ContributorsParser extends JatsParser {
  private readonly tag = 'contrib-group > contrib[contrib-type="author"]'

  parse(): ManuscriptNode | undefined {
    const elements = this.doc.querySelectorAll(this.tag)
    if (!elements.length) {
      return
    }
    const contributors = this.createElement('contributors')
    for (const element of elements) {
      contributors.appendChild(element)
    }
    return this.parser.parse(contributors, {
      topNode: this.schema.nodes.contributors.create(),
    })
  }

  private extractFootnotes(element: HTMLElement): ContributorFootnote[] {
    const fnXrefs = element.querySelectorAll('xref[ref-type="fn"]')
    return Array.from(fnXrefs)
      .map((xref) => {
        const rid = xref.getAttribute('rid')
        if (rid) {
          return {
            noteID: rid,
            noteLabel: trimTextContent(xref) || '',
          }
        }
      })
      .filter((xref) => xref !== undefined)
  }
  private extractAffiliations(element: HTMLElement): string[] {
    const affiliationsXrefs = element.querySelectorAll('xref[ref-type="aff"]')
    return Array.from(affiliationsXrefs)
      .map((xref) => {
        const rid = xref.getAttribute('rid')
        if (rid) {
          return rid
        }
      })
      .filter((xref) => xref !== undefined)
  }
  private extractCorrespondences(element: HTMLElement): ContributorCorresp[] {
    const correspXrefs = element.querySelectorAll('xref[ref-type="corresp"]')
    return Array.from(correspXrefs)
      .map((xref) => {
        const rid = xref.getAttribute('rid')
        if (rid) {
          return {
            correspID: rid,
            correspLabel: trimTextContent(xref) || '',
          }
        }
      })
      .filter((xref) => xref !== undefined)
  }
  private extractBibliographicName(element: HTMLElement) {
    return {
      given: trimTextContent(element, 'name > given-names'),
      family: trimTextContent(element, 'name > surname'),
      ObjectType: ObjectTypes.BibliographicName,
    }
  }
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'contrib[contrib-type="author"]',
        node: 'contributor',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            role: 'author',
            affiliations: this.extractAffiliations(element),
            corresp: this.extractCorrespondences(element),
            footnote: this.extractFootnotes(element),
            isCorresponding: element.getAttribute('corresp')
              ? element.getAttribute('corresp') === 'yes'
              : undefined,
            bibliographicName: this.extractBibliographicName(element),
            ORCIDIdentifier: trimTextContent(
              element,
              'contrib-id[contrib-id-type="orcid"]'
            ),
            priority: JatsParser.parsePriority(
              element.getAttribute('priority')
            ),
            email: trimTextContent(element, 'email') || '',
          }
        },
        getContent: () => {
          return Fragment.from(this.schema.text('_'))
        },
      },
    ]
  }
}
