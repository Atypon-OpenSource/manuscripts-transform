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

const attributionParents = new Set([
  'figure_element',
  'image_element',
  'hero_image',
])

class Migration457 implements MigrationScript {
  fromVersion = '4.5.6'
  toVersion = '4.5.7'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (!attributionParents.has(node.type)) {
      return node
    }

    const attributionIndex = node.content?.findIndex(
      (n) => n.type === 'attribution'
    )

    if (attributionIndex === undefined || attributionIndex === -1) {
      if (!node.content) {
        return node
      }
      const altTextIndex = node.content.findIndex((c) => c.type === 'alt_text')
      return {
        ...node,
        content: [
          ...node.content.slice(0, altTextIndex),
          { type: 'attribution', attrs: {} },
          ...node.content.slice(altTextIndex),
        ],
      }
    }

    const attribution = node.content
      ?.filter((n) => n.type === 'attribution')
      .reduce(
        (n, attrib) => ({
          ...attrib,
          content: [...(n.content || []), ...(attrib.content || [])],
        }),
        { type: 'attribution', attrs: {} }
      )

    if (!attribution) {
      return node
    }

    const captionIndex = node.content?.findIndex((n) => n.type === 'caption')

    if (captionIndex === undefined || captionIndex === -1) {
      return node
    }

    return {
      ...node,
      content: [
        ...(node.content?.slice(0, attributionIndex) || []),
        ...(node.content?.slice(captionIndex, captionIndex + 1) || []),
        attribution,
        ...(node.content?.slice(captionIndex + 1) || []),
      ],
    }
  }
}

export default Migration457
