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

export class Migration3012 implements MigrationScript {
  fromVersion = '3.0.11'
  toVersion = '3.0.12'

  private suffixMap = new Map([
    ['competing-interests', 'coi-statement'],
    ['acknowledgement', 'acknowledgements'],
    ['introduction', 'intro'],
    ['materials-method', 'methods'],
  ])

  migrateNode(node: JSONNode): JSONNode {
    if (
      node.type === 'section' &&
      node.attrs.category.startsWith('MPSectionCategory:')
    ) {
      const [, suffix] = node.attrs.category.split(':', 2)
      const newName = this.suffixMap.get(suffix) || suffix
      return {
        ...node,
        attrs: {
          ...node.attrs,
          category: newName,
        },
      }
    }
    return node
  }
}

export default Migration3012
