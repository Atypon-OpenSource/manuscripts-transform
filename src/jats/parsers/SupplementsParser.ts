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
import { NodeRule } from '../../schema'
import { JatsParser } from './JatsParser'

export class SupplementsParser extends JatsParser {
  parser: DOMParser

  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }

  parse(elements: Element[]) {
    if (!elements.length) {
      return
    }
    const supplements = this.createElement('supplements')
    const title = this.createElement('title')
    title.textContent = 'Supplementary Material'
    supplements.append(title)
    supplements.append(...elements)
    return this.parser.parse(supplements, {
      topNode: this.schema.nodes.supplements.create(),
    })
  }
  nodes: NodeRule[] = [
    {
      tag: 'supplements',
      node: 'supplements',
    },
    {
      tag: 'title',
      node: 'section_title',
    },
    {
      tag: 'supplementary-material',
      node: 'supplement',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(this.XLINK_NAMESPACE, 'href'),
          mimeType: element.getAttribute('mimetype'),
          mimeSubType: element.getAttribute('mime-subtype'),
          title: trimTextContent(element, 'title'),
        }
      },
    },
  ]
}
