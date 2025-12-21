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
import { schema } from '../../index'

class Migration4313 implements MigrationScript {
  fromVersion = '4.3.12'
  toVersion = '4.3.13'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (!node.content) {
      return node
    }

    const figcaptionIndex = node.content?.findIndex(
      (child) => child.type === 'figcaption'
    )
    if (figcaptionIndex != undefined && figcaptionIndex !== -1) {
      const figcaption = node.content[figcaptionIndex]
      const content = [
        ...node.content.slice(0, figcaptionIndex),
        ...(figcaption.content || []),
        ...node.content.slice(figcaptionIndex + 1),
      ].filter(
        (child) =>
          // will filter out caption from table_element as schema allow just caption_title, and opposite will be for figure_element
          !(child.type === 'caption' && node.type === 'table_element') &&
          !(child.type === 'caption_title' && node.type === 'figure_element')
      )
      return { ...node, content }
    } else if (node.type === 'table_element') {
      return {
        ...node,
        content: [
          schema.nodes.caption_title.create().toJSON(),
          ...node.content,
        ],
      }
    } else if (node.type === 'supplement') {
      return {
        ...node,
        content: [
          schema.nodes.caption_title.create().toJSON(),
          schema.nodes.caption.create().toJSON(),
          ...node.content,
        ],
      }
    }

    if (node.type === 'image_element') {
      const altTextIndex = node.content.findIndex(
        (child) => child.type === 'alt_text'
      )
      return {
        ...node,
        content: [
          ...node.content.slice(0, altTextIndex),
          schema.nodes.caption.create().toJSON(),
          ...node.content.slice(altTextIndex),
        ],
      }
    }

    return node
  }
}

export default Migration4313
