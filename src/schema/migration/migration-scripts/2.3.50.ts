/*!
 * © 2019 Atypon Systems LLC
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

// @NOTE - this is an example migration
class Migration2350 implements MigrationScript {
  fromVersion = '2.3.20'
  toVersion = '2.3.50'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  migrateNode(node: JSONNode, doc: JSONNode) {
    if (node.type === 'figure_element') {
      const filteredContent = node.content?.filter((n) => {
        return n.type == 'figcaption' || n.type == 'listing'
      })
      const newNode = {
        ...node,
        content: [
          {
            type: 'title',
            attrs: { id: 'some-title-id', dataTracked: null },
          },
          ...(filteredContent || []),
        ],
      }
      return newNode
    }
    return node
  }
}

export default Migration2350
