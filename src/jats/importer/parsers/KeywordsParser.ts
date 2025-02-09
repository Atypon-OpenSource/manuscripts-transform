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

import { ManuscriptNode, NodeRule } from '../../../schema'
import { JatsParser } from './JatsParser'

export class KeywordsParser extends JatsParser {
  private readonly tag = 'kwd-group'
  parse(): ManuscriptNode | undefined {
    const kwdGroup = this.doc.querySelector(this.tag)
    if (!kwdGroup) {
      return
    }
    kwdGroup.querySelector('title')?.remove()
    const keywords = this.createElement('keywords')
    const title = this.createElement('title')
    title.textContent = 'Keywords'
    const keywordsElement = this.createElement('keywords_element')
    keywordsElement.append(kwdGroup)
    keywords.append(title)
    keywords.appendChild(keywordsElement)
    return this.parser.parse(keywords, {
      topNode: this.schema.nodes.keywords.create(),
    })
  }
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'title',
        node: 'section_title',
      },
      {
        tag: 'keywords_element',
        node: 'keywords_element',
      },
      {
        tag: 'kwd-group',
        node: 'keyword_group',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.id,
            type: element.getAttribute('kwd-group-type'),
          }
        },
      },
      {
        tag: 'kwd',
        node: 'keyword',
      },
    ]
  }
}
