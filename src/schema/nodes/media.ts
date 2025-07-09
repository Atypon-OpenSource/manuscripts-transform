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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

export interface MediaAttrs {
  id: string
  href: string
  mimetype: string
  mimeSubtype: string
}

export interface MediaNode extends ManuscriptNode {
  attrs: MediaAttrs
}

export const media: NodeSpec = {
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
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'media',
        id: node.attrs.id,
      },
    ]
  },
}

export const isMediaNode = (node: ManuscriptNode): node is MediaNode =>
  node.type === node.type.schema.nodes.media
