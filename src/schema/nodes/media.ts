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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  href: string
  show: string
  mimetype: string
  mimeSubtype: string
}

export interface MediaNode extends ManuscriptNode {
  attrs: Attrs
}

export const media: NodeSpec = {
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
    href: { default: '' },
    show: { default: '' },
    mimetype: { default: '' },
    mimeSubtype: { default: '' },
  },
  selectable: false,
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
