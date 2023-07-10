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
  placeholder: string
}

export interface CaptionNode extends ManuscriptNode {
  attrs: Attrs
}

export const caption: NodeSpec = {
  content: 'inline*',
  attrs: {
    placeholder: { default: 'Caption...' },
    dataTracked: { default: null },
  },
  selectable: false,
  isolating: true,
  group: 'block',
  parseDOM: [
    {
      tag: 'p',
      getAttrs: (node) => {
        const dom = node as HTMLParagraphElement

        return {
          placeholder: dom.getAttribute('data-placeholder-text'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const captionNode = node as CaptionNode

    const attrs: { [key: string]: string } = {}

    attrs.class = 'caption-description'

    if (captionNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = captionNode.attrs.placeholder
    }

    if (!captionNode.textContent) {
      attrs.class = `${attrs.class} placeholder`
    }

    attrs.contenteditable = 'true'

    return ['p', attrs, 0]
  },
}
