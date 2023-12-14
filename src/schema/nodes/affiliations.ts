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
}

export interface AffiliationsNode extends ManuscriptNode {
  attrs: Attrs
}

export const affiliations: NodeSpec = {
  content: 'section_title? affiliation*',
  attrs: {
    id: { default: 'META_SECTION_AFFILLIATIONS' },
    dataTracked: { default: null },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.affiliations',
      getAttrs: (section) => {
        const dom = section as HTMLElement

        return {
          contents: dom.innerHTML,
        }
      },
    },
  ],
  toDOM: (node) => {
    const affiliations = node as AffiliationsNode
    return [
      'section',
      {
        class: 'affiliations',
        id: affiliations.attrs.id,
      },
      0,
    ]
  },
}
export const isAffiliationsNode = (
  node: ManuscriptNode
): node is AffiliationsNode => node.type === schema.nodes.affiliations
