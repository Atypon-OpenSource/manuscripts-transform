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

class Migration3030 implements MigrationScript {
  fromVersion = '3.0.29'
  toVersion = '3.0.30'

  private addTypeToFigures(node: JSONProsemirrorNode, type: string) {
    if (!Array.isArray(node.content)) {
      return node.content
    }

    return node.content.map((child) =>
      child.type === 'figure'
        ? { ...child, attrs: { ...child.attrs, type } }
        : child
    )
  }

  private migrateFigure(node: JSONProsemirrorNode): JSONProsemirrorNode {
    const type = node.attrs.contentType || node.attrs.type || ''
    if (node.attrs.contentType) {
      delete node.attrs.contentType
    }
    return { ...node, attrs: { ...node.attrs, type } }
  }

  private migrateFigureElement(node: JSONProsemirrorNode): JSONProsemirrorNode {
    const newContent = this.addTypeToFigures(node, node.attrs.type || '')
    if (node.attrs.type) {
      delete node.attrs.type
    }
    return { ...node, content: newContent, attrs: { ...node.attrs } }
  }

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'figure') {
      return this.migrateFigure(node)
    }

    if (node.type === 'figure_element') {
      return this.migrateFigureElement(node)
    }

    return node
  }
}

export default Migration3030
