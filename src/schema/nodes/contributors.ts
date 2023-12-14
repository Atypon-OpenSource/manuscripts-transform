/*!
 * © 2023 Atypon Systems LLC
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

import { schema } from '../index'
import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  contents: string
}

export interface ContributorsNode extends ManuscriptNode {
  attrs: Attrs
}

export const contributors: NodeSpec = {
  content: 'section_title? contributor*',
  attrs: {
    id: { default: 'META_SECTION_CONTRIBUTORS' },
    dataTracked: { default: null },
    contents: { default: '' },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.contributors',
      getAttrs: () => {
        return {
          contents: '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const contributors = node as ContributorsNode
    return [
      'section',
      {
        class: 'contributors',
        id: contributors.attrs.id,
      },
      0,
    ]
  },
}
export const isContributorsNode = (
  node: ManuscriptNode
): node is ContributorsNode => node.type === schema.nodes.contributors
