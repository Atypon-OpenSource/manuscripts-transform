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

class Migration446 implements MigrationScript {
  fromVersion = '4.4.5'
  toVersion = '4.4.6'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type !== 'abstracts' || !node.content) {
      return node
    }

    const children = node.content.map((child) => {
      const type = child.type === 'section' ? 'abstract' : child.type
      const category = child.attrs?.category
      const attrs =
        typeof category === 'string' && category.startsWith('abstract-')
          ? { ...child.attrs, category: category.slice('abstract-'.length) }
          : child.attrs
      return { ...child, type, attrs }
    })

    const ABSTRACT_NODE_ORDER: Record<string, number> = {
      abstract: 0,
      graphical_abstract_section: 1,
      trans_abstract: 2,
      trans_graphical_abstract: 3,
    }

    const ordered = children
      .map((child, index) => ({ child, index }))
      .sort((a, b) => {
        const orderA = ABSTRACT_NODE_ORDER[a.child.type] ?? 0
        const orderB = ABSTRACT_NODE_ORDER[b.child.type] ?? 0
        return orderA - orderB || a.index - b.index
      })
      .map(({ child }) => child)

    return {
      ...node,
      content: ordered,
    }
  }
}

export default Migration446
