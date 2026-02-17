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

import { schema } from '../index'
import type { ManuscriptNode } from '../types'

export interface TransGraphicalAbstractAttrs {
  id: string
  lang: string
  category: string
}

export interface TransGraphicalAbstractNode extends ManuscriptNode {
  attrs: TransGraphicalAbstractAttrs
}

export const transGraphicalAbstract: NodeSpec = {
  content: 'section_title (figure_element | placeholder)',
  attrs: {
    id: { default: '' },
    lang: { default: '' },
    category: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.trans-graphical-abstract',
    },
  ],
  toDOM: (node) => {
    const transGraphicalAbstractNode = node as TransGraphicalAbstractNode
    const { id, lang } = transGraphicalAbstractNode.attrs

    return [
      'section',
      {
        id,
        lang,
        class: 'trans-graphical-abstract',
        spellcheck: 'false',
      },
      0,
    ]
  },
}

export const isTransGraphicalAbstractNode = (
  node: ManuscriptNode
): node is TransGraphicalAbstractNode =>
  node.type === schema.nodes.trans_graphical_abstract
