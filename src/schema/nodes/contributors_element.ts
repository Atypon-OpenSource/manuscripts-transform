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
  contents: string
  id: string
  paragraphStyle?: string
}

export interface ContributorsElementNode extends ManuscriptNode {
  attrs: Attrs
}

export const contributorsElement: NodeSpec = {
  content: 'contributor*',
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.manuscript-contributors',
      getAttrs: () => {
        return {
          contents: '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const contributorsElementNode = node as ContributorsElementNode

    return [
      'div',
      {
        class: 'manuscript-contributors',
        id: contributorsElementNode.attrs.id,
      },
      0,
    ]
  },
}
