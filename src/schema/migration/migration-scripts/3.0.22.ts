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
import { JSONNode } from '../migrate'
import { MigrationScript } from '../migration-script'

class Migration3021 implements MigrationScript {
  fromVersion = '3.0.21'
  toVersion = '3.0.22'

  migrateNode(node: JSONNode): JSONNode {
    if (node.type === 'table_header' || node.type === 'table_cell') {
      return {
        ...node,
        content: [
          {
            type: 'text_block',
            attrs: {},
            content: node.content,
          },
        ],
      }
    }
    return node
  }
}

export default Migration3021
