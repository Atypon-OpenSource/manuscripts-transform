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

import { ManuscriptNode, NodeRule } from '../../schema'
import { JatsParser } from './JatsParser'

export class KeywordsParser extends JatsParser {
  parser: DOMParser
  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }
  parse(element: Element | null): ManuscriptNode | undefined {
    if (!element) {
      return
    }
    element.querySelector('title')?.remove()
    const keywords = this.createElement('keywords')
    const title = this.createElement('title')
    title.textContent = 'Keywords'
    keywords.append(title)
    const kwdGroupList = this.createElement('kwd-group-list')
    kwdGroupList.append(element)
    keywords.append(kwdGroupList)
    return this.parser.parse(keywords, {
      topNode: this.schema.nodes.keywords.create(),
    })
  }
  nodes: NodeRule[] = [
    {
      tag: 'title',
      node: 'section_title',
    },
    {
      tag: 'keywords',
      node: 'keywords',
    },
    {
      tag: 'kwd-group-list',
      node: 'keywords_element',
    },
    {
      tag: 'kwd-group',
      node: 'keywords',
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
