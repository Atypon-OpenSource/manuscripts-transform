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
}

export interface KeywordNode extends ManuscriptNode {
  attrs: Attrs
}

export const keyword: NodeSpec = {
  atom: true,
  content: 'inline*',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'span.keyword',
      getAttrs: (node) => {
        const dom = node as HTMLSpanElement

        return {
          id: dom.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const keywordNode = node as KeywordNode
    return [
      'span',
      {
        class: 'keyword',
        id: keywordNode.attrs.id,
      },
      0,
    ]
  },
}
