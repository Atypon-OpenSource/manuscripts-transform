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

import { trimTextContent } from '../../../lib/utils'
import { NodeRule } from '../../../schema'
import { JatsParser } from './JatsParser'

export class BodyParser extends JatsParser {
  private readonly tag = 'body'

  protected initParser(): void {
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.allNodes])
  }
  parse() {
    const element = this.doc.querySelector(this.tag)
    if (!element) {
      return this.schema.nodes.body.create()
    }
    return this.parser.parse(element, {
      topNode: this.schema.nodes.body.create(),
    })
  }
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'sec[sec-type="supplementary-material"]',
        node: 'supplements',
      },
      {
        tag: 'supplementary-material',
        node: 'supplement',
        getAttrs: (node) => {
          const element = node as HTMLElement

          return {
            id: element.getAttribute('id'),
            href: element.getAttributeNS(JatsParser.XLINK_NAMESPACE, 'href'),
            mimeType: element.getAttribute('mimetype'),
            mimeSubType: element.getAttribute('mime-subtype'),
            title: trimTextContent(element, 'title'),
          }
        },
      },
      {
        tag: 'app-group > app',
        node: 'section',
        getAttrs: (node) => {
          const element = node as HTMLElement
          element.setAttribute('sec-type', 'appendices')
          return {
            id: element.getAttribute('id'),
            category: this.chooseSectionCategory(element),
          }
        },
      },
    ]
  }
}
