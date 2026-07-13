/*!
 * © 2026 Atypon Systems LLC
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
import { generateNodeID } from '../../../transformer'
import { JSONProsemirrorNode } from '../../../types'
import { schema } from '../../index'
import { MigrationScript } from '../migration-script'

class Migration447 implements MigrationScript {
  fromVersion = '4.4.6'
  toVersion = '4.4.7'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type !== 'cross_reference') {
      return node
    }

    if (node.attrs?.id) {
      return node
    }

    return {
      ...node,
      attrs: {
        ...(node.attrs ?? {}),
        id: generateNodeID(schema.nodes.cross_reference),
      },
    }
  }
}

export default Migration447
