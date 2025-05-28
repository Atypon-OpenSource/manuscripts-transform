/*!
 * © 2024 Atypon Systems LLC
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

import { Node, NodeSpec } from 'prosemirror-model'

export interface EmbedAttrs {
  id: string
  href: string
  mimetype: string
  mimeSubtype: string
}
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export interface EmbedNode extends Node {
  attrs: EmbedAttrs
}

export const embed: NodeSpec = {
  content: 'figcaption alt_text long_desc',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
    href: { default: undefined },
    mimetype: { default: undefined },
    mimeSubtype: { default: undefined },
    longDesc: { default: '' },
  },
  group: 'block element',
  parseDOM: [
    {
      tag: 'media',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(XLINK_NAMESPACE, 'href'),
          mimetype: element.getAttribute('mimetype'),
          mimeSubtype: element.getAttribute('mime-subtype'),
        }
      },
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'embed',
        id: node.attrs.id,
      },
    ]
  },
}

export const isEmbedNode = (node: Node): node is EmbedNode =>
  node.type === node.type.schema.nodes.embed
