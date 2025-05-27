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

export interface TransAbstractAttrs {
  id: string
  lang: string
}

export interface TransAbstractNode extends ManuscriptNode {
  attrs: TransAbstractAttrs
}

export const transAbstract: NodeSpec = {
  content: '(paragraph | element)* sections*',
  attrs: {
    id: { default: '' },
    lang: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  toDOM: (node) => {
    const { id, lang } = node.attrs
    return [
      'section',
      {
        id,
        lang,
        class: 'trans-abstract',
      },
      0,
    ]
  },
}

export const isTransAbstractNode = (
  node: ManuscriptNode
): node is TransAbstractNode => node.type === schema.nodes.transAbstract
