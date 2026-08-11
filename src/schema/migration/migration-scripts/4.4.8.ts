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

class Migration448 implements MigrationScript {
  fromVersion = '4.4.7'
  toVersion = '4.4.8'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type !== 'abstracts' || !node.content) {
      return node
    }

    const children = node.content.map((child) => {
      const type = child.type === 'section' ? 'abstract' : child.type
      const category = child.attrs?.category
      const attrs =
        category && category.startsWith('abstract-')
          ? { ...child.attrs, category: category.slice('abstract-'.length) }
          : child.attrs
      return { ...child, type, attrs }
    })

    const regular: JSONProsemirrorNode[] = []
    const translated: JSONProsemirrorNode[] = []
    for (const child of children) {
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

export default Migration448
