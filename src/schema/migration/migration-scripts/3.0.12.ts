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

export class Migration3012 implements MigrationScript {
  fromVersion = '3.0.12'
  toVersion = '3.0.13'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'body') {
      const content = node.content?.filter((n) => n.type !== 'toc_section')
      return {
        ...node,
        content,
      }
    }
    return node
  }
}
