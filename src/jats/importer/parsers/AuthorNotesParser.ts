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
export class AuthorNotesParser extends JatsParser {
  private readonly tag = 'article-meta > author-notes'

  parse(): ManuscriptNode | undefined {
    const element = this.doc.querySelector(this.tag)
    if (!element) {
      return
    }
    const sectionTitle = this.createElement('title')
    element.prepend(sectionTitle)
    return this.parser.parse(element, {
      topNode: this.schema.nodes.author_notes.create(),
    })
  }

  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'title',
        node: 'section_title',
      },
      {
        tag: 'corresp',
        node: 'corresp',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const label = element.querySelector('label')
          if (label) {
            label.remove()
          }
          return {
            id: element.getAttribute('id'),
            label: trimTextContent(label),
          }
        },
        getContent: (node) => {
          const element = node as HTMLElement
          return Fragment.from(this.schema.text(trimTextContent(element) || ''))
        },
      },
      {
        tag: 'fn:not([fn-type])',
        node: 'footnote',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
            kind: 'footnote',
          }
        },
      },
      {
        tag: 'p',
        node: 'paragraph',
      },
      {
        tag: 'label',
        ignore: true,
      },
      {
        tag: 'fn',
        ignore: true,
      },
    ]
  }
}
