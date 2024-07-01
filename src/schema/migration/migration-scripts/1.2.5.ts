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

import { schema } from '../..'
import { JSONNode } from '../migrate'
import { MigrationScript } from '../migration-script'

// @NOTE - this is an example migration
class Migration125 implements MigrationScript {
  fromVersion: '1.2.3'
  toVersion: '1.2.4'
  migrateNode(node: JSONNode, doc: JSONNode) {
    if (node.type === 'paragraph') {
      const newNode = schema.nodes.paragraph.create(
        { someNewFanctAttribute: 'example-value', ...node.attrs },
        schema.text('some valid text')
      )
      return newNode.toJSON()
    }
    return node
  }
}

export default Migration125
