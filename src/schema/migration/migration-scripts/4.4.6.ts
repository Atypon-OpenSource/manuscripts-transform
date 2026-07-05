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
import { JSONProsemirrorNode } from '../../../types'
import { MigrationScript } from '../migration-script'

const TRANS_ABSTRACT_TYPES = ['trans_abstract', 'trans_graphical_abstract']

// The abstracts content model now requires that translated abstracts appear
// after all regular abstracts. Existing documents may have them interleaved
// (e.g. a translation inserted directly after its source abstract), so reorder
// the children to keep all translated abstracts last while preserving their
// relative order.
class Migration446 implements MigrationScript {
  fromVersion = '4.4.5'
  toVersion = '4.4.6'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type !== 'abstracts' || !node.content) {
      return node
    }

    const regular: JSONProsemirrorNode[] = []
    const translated: JSONProsemirrorNode[] = []
    for (const child of node.content) {
      if (TRANS_ABSTRACT_TYPES.includes(child.type)) {
        translated.push(child)
      } else {
        regular.push(child)
      }
    }

    return {
      ...node,
      content: [...regular, ...translated],
    }
  }
}

export default Migration446
