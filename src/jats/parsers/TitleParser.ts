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

import { DOMParser, Fragment } from 'prosemirror-model'

import { ManuscriptNode, NodeRule } from '../../schema'
import { htmlFromJatsNode } from '../importer/jats-parser-utils'
import { JatsParser } from './JatsParser'

export class TitleParser extends JatsParser {
  private readonly defaultTitle = 'Untitled Manuscript'
  private readonly tag = 'article-meta > title-group > article-title'
  parser: DOMParser

  constructor(doc: Document) {
    super(doc)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.nodes])
  }

  parse(): ManuscriptNode {
    const node = this.parser.parse(this.doc, {
      topNode: this.schema.nodes.title.create(),
    })
    return node
  }
  nodes: NodeRule[] = [
    {
      tag: this.tag,
      node: 'title',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
      getContent: (node) => {
        const element = node as HTMLElement
        return Fragment.from(
          htmlFromJatsNode(element) || this.schema.text(this.defaultTitle)
        )
      },
    },
  ]
}
