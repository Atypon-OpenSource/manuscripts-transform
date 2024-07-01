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
class Migration125 implements MigrationScript {
  fromVersion: '1.2.3'
  toVersion: '1.2.4'
  migrateNode(node: JSONNode, doc: JSONNode) {
    /*
      NOTE - if schema is used in this function, it is imported from the current version of the package
      in pratical terms it means that it's always the latest schema and you can't rely on that it will correspond the version in
      which you created the migration script. That would also mean that you shouldn't rely on schema for migrations
    */
    if (node.type === 'paragraph') {
      return {
        ...node,
        attrs: {
          ...node.attrs,
          someNewFanctAttribute: 'example-value',
        },
      }
    }
    return node
  }
}

export default Migration125
