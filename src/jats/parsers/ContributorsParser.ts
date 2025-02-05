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
import { DOMParser, Fragment } from 'prosemirror-model'

import { trimTextContent } from '../../lib/utils'
import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  NodeRule,
} from '../../schema'
import { JatsParser } from './JatsParser'

export class ContributorsParser extends JatsParser {
  parser: DOMParser

  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }

  parse(elements: Element[]): ManuscriptNode | undefined {
    if (!elements.length) {
      return
    }
    const contribs = this.createElement('contributors')
    for (const element of elements) {
      contribs.appendChild(element)
    }
    return this.parser.parse(contribs, {
      topNode: this.schema.nodes.contributors.create(),
    })
  }

  nodes: NodeRule[] = [
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
                noteLabel: trimTextContent(xref) || '',
              })
              break
            case 'corresp':
              corresp.push({
                correspID: rid,
                correspLabel: trimTextContent(xref) || '',
              })
              break
            case 'aff':
              affiliations.push(rid)
              break
          }
        }

        return {
          id: element.getAttribute('id'),
          role: 'author',
          affiliations,
          corresp,
          footnote,
          isCorresponding: element.getAttribute('corresp')
            ? element.getAttribute('corresp') === 'yes'
            : undefined,
          bibliographicName: {
            given: trimTextContent(element, 'name > given-names'),
            family: trimTextContent(element, 'name > surname'),
            ObjectType: ObjectTypes.BibliographicName,
          },
          ORCIDIdentifier: trimTextContent(
            element,
            'contrib-id[contrib-id-type="orcid"]'
          ),
          priority: this.parsePriority(element.getAttribute('priority')),
          email: trimTextContent(element, 'email') || '',
        }
      },
      getContent: () => {
        return Fragment.from(this.schema.text('_'))
      },
    },
  ]
}
