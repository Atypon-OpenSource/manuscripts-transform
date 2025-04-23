/*!
 * © 2024 Atypon Systems LLC
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

class Migration2322 implements MigrationScript {
  fromVersion = '2.3.21'
  toVersion = '2.3.22'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'table_element' && Array.isArray(node.content)) {
      let figcaptionNode = null
      const remainingContent = []

      for (const child of node.content) {
        if (child.type === 'figcaption') {
          figcaptionNode = child
        } else {
          remainingContent.push(child)
        }
      }

      // Create the new content array
      const newContent = figcaptionNode
        ? [figcaptionNode, ...remainingContent]
        : remainingContent

      // Return the updated node with the new content order
      return {
        ...node,
        content: newContent,
      }
    }

    return node
  }
}

export default Migration2322
