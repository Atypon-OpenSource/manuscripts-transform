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

class Migration3047 implements MigrationScript {
  fromVersion = '3.0.46'
  toVersion = '3.0.47'

  migrateNode(node: JSONNode): JSONNode {
    if (node.type === 'bibliography_item') {
      const authors = node.attrs.author || []
      const doi = node.attrs.doi

      delete node.attrs.author
      delete node.attrs.doi

      return {
        ...node,
        attrs: {
          ...node.attrs,
          authors,
          pubIDs: doi ? [{ type: 'doi', content: doi }] : [],
        },
      }
    }
    return node
  }
}

export default Migration3047
