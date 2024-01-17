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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  href: string
  mimeType: string
  mimeSubType: string
  title: string
}

export interface SupplementaryMaterialNode extends ManuscriptNode {
  attrs: Attrs
}

export const supplementaryMaterial: NodeSpec = {
  attrs: {
    id: { default: '' },
    href: { default: '' },
    mimeType: { default: '' },
    mimeSubType: { default: '' },
    title: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'div.supplementary-material',
      getAttrs: (dom) => {
        const el = dom as HTMLElement
        const id = el.getAttribute('id')
        const href = el.getAttribute('href')
        const mimeType = el.getAttribute('mimeType')
        const mimeSubType = el.getAttribute('mimeSubType')
        const title = el.textContent
        return {
          id,
          href,
          mimeType,
          mimeSubType,
          title,
        }
      },
    },
  ],
  toDOM: (node) => {
    const supplementaryMaterials = node as SupplementaryMaterialNode

    return [
      'div',
      {
        id: supplementaryMaterials.attrs.id,
        class: 'SupplementaryMaterial',
        href: node.attrs.href,
        mimeType: node.attrs.mimeType,
        mimeSubType: node.attrs.mimeSubType,
        title: node.attrs.title,
      },
    ]
  },
}
