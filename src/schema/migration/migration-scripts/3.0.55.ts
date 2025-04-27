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
import { MigrationScript } from '../migration-script'

class Migration3055 implements MigrationScript {
  fromVersion = '3.0.54'
  toVersion = '3.0.55'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'bibliography_item') {
      const doi = node.attrs.doi
      const containerTitle = node.attrs.containerTitle
      delete node.attrs.doi
      delete node.attrs.containerTitle
      return {
        ...node,
        attrs: {
          ...node.attrs,
          DOI: doi,
          'container-title': containerTitle,
        },
      }
    }
    return node
  }
}

export default Migration3055
