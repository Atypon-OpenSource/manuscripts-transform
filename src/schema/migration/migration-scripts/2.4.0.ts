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
class Migration240 implements MigrationScript {
  fromVersion = '2.3.90'
  toVersion = '2.4.0'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  migrateNode(node: JSONNode, doc: JSONNode) {
    /*
      NOTE - if schema is used in this function, it is imported from the current version of the package
      in pratical terms it means that it's always the latest schema and you can't rely on that it will correspond the version in
      which you created the migration script. That would also mean that you shouldn't rely on schema for migrations
    */
    if (node.type === 'figure_element') {
      const filteredContent = node.content?.filter((n) => {
        return n.type == 'figcaption' || n.type == 'listing'
      })

      const newNode = {
        ...node,
        content: [
          {
            type: 'donut',
            attrs: {
              id: 'some-id',
              lambrusco: 'butter',
              contentType: '',
              dataTracked: null,
            },
          },
          ...(filteredContent || []),
        ],
      }
      const title = node.content?.find((n) => n.type == 'title')
      if (title) {
        newNode.content.unshift(title)
      }
      return newNode
    }
    return node
  }
}

export default Migration240
