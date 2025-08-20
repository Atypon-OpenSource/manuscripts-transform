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
import { JSONProsemirrorNode } from '../../../types'
import { schema } from '../..'
import { MigrationScript } from '../migration-script'

class Migration4213 implements MigrationScript {
  fromVersion = '4.2.12'
  toVersion = '4.2.13'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'trans_abstract') {
      const content = node.content || []
      const sectionTitleNode = schema.nodes.section_title.create()
      return {
        ...node,
        content: [sectionTitleNode.toJSON(), ...content],
      }
    }
    return node
  }
}

export default Migration4213
