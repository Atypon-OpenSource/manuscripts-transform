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
import { buildContribution } from '@manuscripts/json-schema'

import { trimTextContent } from '../../../lib/utils'
import { NodeRule } from '../../../schema'
import { JatsParser } from './JatsParser'

export class CommentsParser extends JatsParser {
  private readonly tag = 'comments'
  private readonly DEFAULT_PROFILE_ID =
    'MPUserProfile:0000000000000000000000000000000000000001'

  parse() {
    const element = this.doc.querySelector(this.tag)
    if (!element) {
      return this.schema.nodes.comments.create()
    }
    return this.parser.parse(element, {
      topNode: this.schema.nodes.comments.create(),
    })
  }
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'comment',
        node: 'comment',
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            id: element.getAttribute('id'),
            target: element.getAttribute('target-id'),
            contents: trimTextContent(element),
            contributions: [buildContribution(this.DEFAULT_PROFILE_ID)],
          }
        },
      },
    ]
  }
}
