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
import { Node, NodeSpec } from 'prosemirror-model'

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
export interface AttachmentAttrs {
  id: string
  href: string
  type: string
}

export interface AttachmentNode extends Node {
  attrs: AttachmentAttrs
}
export const attachment: NodeSpec = {
  attrs: {
    id: { default: '' },
    type: { default: '' },
    href: { default: '' },
  },
  parseDOM: [
    {
      tag: 'attachments > self-uri',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(XLINK_NAMESPACE, 'href') || '',
          type: element.getAttribute('content-type') || '',
        }
      },
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'attachment',
        id: node.attrs.id,
      },
    ]
  },
}
export const isAttachmentNode = (node: Node): node is AttachmentNode =>
  node.type === node.type.schema.nodes.attachment
