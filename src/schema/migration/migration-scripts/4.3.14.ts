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
import { Nodes, schema } from '../../index'

interface Config {
  title?: 'required' | 'optional'
  caption?: 'required' | 'optional'
  location: { pos?: 'start' | 'end'; before?: Nodes }
}

const CONFIG: Record<string, Config> = {
  figure_element: { caption: 'required', location: { before: 'alt_text' } },
  table_element: { title: 'required', location: { pos: 'start' } },
  image_element: { caption: 'required', location: { before: 'alt_text' } },
  listing_element: {
    title: 'required',
    caption: 'required',
    location: { pos: 'end' },
  },
  supplement: {
    title: 'required',
    caption: 'required',
    location: { pos: 'start' },
  },
  embed: { title: 'required', caption: 'required', location: { pos: 'start' } },
  box_element: {
    title: 'optional',
    caption: 'optional',
    location: { pos: 'start' },
  },
}

class Migration4314 implements MigrationScript {
  fromVersion = '4.3.13'
  toVersion = '4.3.14'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    const config = CONFIG[node.type]
    if (!node.content || !config) {
      return node
    }

    const figCaption = node.content.find((n) => n.type === 'figcaption')
    const foundTitle = (figCaption?.content || []).find(
      (n) => n.type === 'caption_title'
    )
    const foundCaption = (figCaption?.content || []).find(
      (n) => n.type === 'caption'
    )

    const cleanContent = node.content.filter((n) => n.type !== 'figcaption')

    const placeholderTitle = schema.nodes.caption_title.create().toJSON()
    const placeholderCaption = schema.nodes.caption.create().toJSON()

    const captionGroup: JSONProsemirrorNode[] = []

    if (
      config.title === 'required' ||
      (config.title === 'optional' && foundTitle)
    ) {
      captionGroup.push(foundTitle || placeholderTitle)
    }

    if (
      config.caption === 'required' ||
      (config.caption === 'optional' && foundCaption)
    ) {
      captionGroup.push(foundCaption || placeholderCaption)
    }

    if (config.location.pos === 'start') {
      cleanContent.unshift(...captionGroup)
    } else if (config.location.pos === 'end') {
      cleanContent.push(...captionGroup)
    } else if (config.location.before) {
      const idx = cleanContent.findIndex(
        (n) => n.type === config.location.before
      )
      cleanContent.splice(
        idx === -1 ? cleanContent.length : idx,
        0,
        ...captionGroup
      )
    }

    return { ...node, content: cleanContent }
  }
}

export default Migration4314
