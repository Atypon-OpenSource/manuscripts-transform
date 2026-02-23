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

export interface SupplementAttrs {
  id: string
  href: string
  mimeType: string
  mimeSubType: string
}

export interface SupplementNode extends ManuscriptNode {
  attrs: SupplementAttrs
}

export const supplement: NodeSpec = {
  content: 'caption_title caption',
  attrs: {
    id: { default: '' },
    href: { default: '' },
    mimeType: { default: '' },
    mimeSubType: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'div.supplement',
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
    const supplement = node as SupplementNode

    return [
      'div',
      {
        id: supplement.attrs.id,
        class: 'Supplement',
        href: node.attrs.href,
        mimeType: node.attrs.mimeType,
        mimeSubType: node.attrs.mimeSubType,
        title: node.attrs.title,
      },
    ]
  },
}
