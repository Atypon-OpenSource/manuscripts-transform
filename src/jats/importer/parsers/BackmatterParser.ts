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

import { NodeRule } from '../../../schema'
import { JatsParser } from './JatsParser'

export class BackmatterParser extends JatsParser {
  private readonly tag = 'back'
  protected initParser(): void {
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.allNodes])
  }

  parse() {
    const element = this.doc.querySelector(this.tag)
    if (!element) {
      return this.schema.nodes.backmatter.create()
    }
    return this.parser.parse(element, {
      topNode: this.schema.nodes.backmatter.create(),
    })
  }
  protected get nodes(): NodeRule[] {
    return [
      { tag: 'bio', ignore: true },
      {
        tag: 'app-group > app',
        node: 'section',
        getAttrs: (node) => {
          const element = node as HTMLElement
          element.setAttribute('sec-type', 'appendices')
          return {
            category: this.chooseSectionCategory(element),
          }
        },
      },
      {
        tag: 'sec[sec-type="endnotes"]',
        node: 'footnotes_section',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
          }
        },
      },
    ]
  }
}
