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
import {getTrimmedAttribute} from "../../lib/utils";

interface Attrs {
  placeholder: string
}

export interface CaptionTitleNode extends ManuscriptNode {
  attrs: Attrs
}

export const captionTitle: NodeSpec = {
  content: 'inline*',
  group: 'block',
  selectable: false,
  attrs: {
    placeholder: { default: 'Title...' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'label',
      getAttrs: (node) => {
        const dom = node as HTMLSpanElement

        return {
          placeholder: getTrimmedAttribute(dom, 'data-placeholder-text'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const captionTitleNode = node as CaptionTitleNode

    const attrs: { [key: string]: string } = {}

    attrs.class = 'caption-title'

    if (captionTitleNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = captionTitleNode.attrs.placeholder
    }

    if (!captionTitleNode.textContent) {
      attrs.class = `${attrs.class} placeholder`
    }

    attrs.contenteditable = 'true'

    return ['label', attrs, 0]
  },
}
