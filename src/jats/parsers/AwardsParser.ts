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

import { DOMParser } from 'prosemirror-model'

import { trimTextContent } from '../../lib/utils'
import { ManuscriptNode, NodeRule } from '../../schema'
import { JatsParser } from './JatsParser'

export class AwardsParser extends JatsParser {
  parser: DOMParser
  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }
  parse(element: Element | null): ManuscriptNode | undefined {
    if (!element) {
      return
    }
    return this.parser.parse(element, {
      topNode: this.schema.nodes.awards.create(),
    })
  }
  nodes: NodeRule[] = [
    {
      tag: 'funding-group',
      node: 'awards',
    },
    {
      tag: 'award-group',
      node: 'award',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          recipient: trimTextContent(element, 'principal-award-recipient'),
          code: Array.from(element.querySelectorAll('award-id'))
            .map((awardID) => trimTextContent(awardID))
            .reduce((acc, text) => (acc ? `${acc};${text}` : text), ''),
          source: trimTextContent(element, 'funding-source'),
        }
      },
    },
  ]
}
