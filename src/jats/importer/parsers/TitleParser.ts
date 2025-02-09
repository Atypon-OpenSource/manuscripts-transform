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
import { htmlFromJatsNode } from '../jats-parser-utils'
import { JatsParser } from './JatsParser'

export class TitleParser extends JatsParser {
  private readonly defaultTitle = 'Untitled Manuscript'
  private readonly tag = 'front > article-meta > title-group > article-title'

  parse(): ManuscriptNode {
    let title = this.doc.querySelector(this.tag)
    if (!title) {
      title = this.createElement('article-title')
      title.innerHTML = this.defaultTitle
    } else {
      title.innerHTML =
        htmlFromJatsNode(title, this.createElement) ?? this.defaultTitle
    }
    return this.parser.parse(title, {
      topNode: this.schema.nodes.title.create(),
    })
  }

  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'article-title',
        node: 'title',
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
