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
import { generateNodeID } from '../../../transformer'
import { JSONProsemirrorNode } from '../../../types'
import { schema } from '../../index'
import { MigrationScript } from '../migration-script'

class Migration3056 implements MigrationScript {
  fromVersion = '3.0.55'
  toVersion = '3.0.66'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    const targetNodeTypes = [
      'figure_element',
      'table_element',
      'image_element',
      'figure',
      'embed',
    ]
    const content = node.content

    if (!targetNodeTypes.includes(node.type) || !content) {
      return node
    }

    if (!content.some((node) => node.type === 'alt_text')) {
      this.addAltText(node, content)
    }

    if (!content.some((node) => node.type === 'long_desc')) {
      this.addLongDesc(content)
    }

    return node
  }

  private addAltText(
    node: JSONProsemirrorNode,
    content: JSONProsemirrorNode[]
  ): void {
    const altText = schema.nodes.alt_text
      .create({
        id: generateNodeID(schema.nodes.alt_text),
      })
      .toJSON()

    switch (node.type) {
      case 'image_element':
        if (content.some((n) => n.type === 'long_desc')) {
          const longDescIndex = content.findIndex((n) => n.type === 'long_desc')
          content.splice(longDescIndex, 0, altText)
        } else {
          content.push(altText)
        }
        break

      case 'figure_element':
      case 'embed': {
        const figCaption = content.findIndex((n) => n.type === 'figcaption')
        if (figCaption !== -1) {
          content.splice(figCaption + 1, 0, altText)
        }
        break
      }

      case 'table_element': {
        const elementTypes = [
          'table_element_footer',
          'col_group',
          'table',
          'placeholder',
        ]
        for (const type of elementTypes) {
          const index = content.findIndex((n) => n.type === type)
          if (index !== -1) {
            content.splice(index + 1, 0, altText)
            break
          }
        }
        break
      }
    }
  }

  private addLongDesc(content: JSONProsemirrorNode[]): void {
    const altTextIndex = content.findIndex((n) => n.type === 'alt_text')
    if (altTextIndex !== -1) {
      content.splice(
        altTextIndex + 1,
        0,
        schema.nodes.long_desc
          .create({
            id: generateNodeID(schema.nodes.long_desc),
          })
          .toJSON()
      )
    }
  }
}

export default Migration3056
