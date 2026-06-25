/*!
 * © 2026 Atypon Systems LLC
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
import { JSONProsemirrorNode } from '../../../types'
import { MigrationScript } from '../migration-script'

class Migration442 implements MigrationScript {
  fromVersion = '4.4.1'
  toVersion = '4.4.2'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    switch (node.type) {
      case 'hero_image':
        if (!node.attrs || node.attrs.type === undefined) {
          return {
            ...node,
            attrs: { ...(node.attrs ?? {}), type: 'leading' },
          }
        }
        return node
      case 'pullquote_element':
        if (!node.attrs || node.attrs.type === undefined) {
          const hasImage = node.content?.[0]?.type === 'quote_image'
          return {
            ...node,
            attrs: {
              ...(node.attrs ?? {}),
              type: hasImage ? 'quote-with-image' : 'pullquote',
            },
          }
        }
        return node
      case 'box_element':
      case 'table_element':
        if (!node.attrs || node.attrs.type === undefined) {
          return {
            ...node,
            attrs: { ...(node.attrs ?? {}), type: '' },
          }
        }
        return node
      default:
        return node
    }
  }
}

export default Migration442
