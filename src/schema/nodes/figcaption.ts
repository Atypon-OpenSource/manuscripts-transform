/*!
 * © 2019 Atypon Systems LLC
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

import { DOMParser, Fragment, Node, NodeSpec } from 'prosemirror-model'

export interface FigCaptionNode extends Node {
  attrs: Record<string, unknown>
}

export const figcaption: NodeSpec = {
  content: 'caption_title? caption*',
  group: 'block',
  attrs: { dataTracked: { default: null } },
  isolating: true,
  selectable: false,
  parseDOM: [
    {
      tag: 'figcaption',
    },
    {
      tag: 'caption',
      context: 'figure/',
    },
    {
      tag: 'caption',
      context: 'figure_element/|table_element/|embed/',
      getContent: (node, schema) => {
        const parser = DOMParser.fromSchema(schema)
        const element = node as HTMLElement
        const content = []
        const title = element.querySelector('title')
        if (title) {
          const captionTitle = schema.nodes.caption_title.create()
          content.push(parser.parse(title, { topNode: captionTitle }))
        }
        const paragraphs = element.querySelectorAll('p')
        if (paragraphs.length) {
          const figcaption = schema.nodes.caption.create()
          for (const paragraph of paragraphs) {
            content.push(parser.parse(paragraph, { topNode: figcaption }))
          }
        }
        return Fragment.from(content) as Fragment
      },
    },
    {
      tag: 'caption',
      context: 'box_element/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: () => ['figcaption', 0],
}

export const isFigCaptionNode = (node: Node): node is FigCaptionNode =>
  node.type === node.type.schema.nodes.figcaption
