/*!
 * © 2024 Atypon Systems LLC
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

import { Node, NodeSpec } from 'prosemirror-model'

import { getTrimmedTextContent } from '../utills'

export interface AwardAttrs {
  id: string
  recipient: string
  code: string
  source: string
}

export interface AwardNode extends Node {
  attrs: AwardAttrs
}

export const award: NodeSpec = {
  attrs: {
    id: { default: '' },
    recipient: { default: undefined },
    code: { default: undefined },
    source: { default: undefined },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'award-group',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          recipient: getTrimmedTextContent(
            element,
            'principal-award-recipient'
          ),
          code: Array.from(element.querySelectorAll('award-id'))
            .map((awardID) => getTrimmedTextContent(awardID))
            .reduce((acc, text) => (acc ? `${acc};${text}` : text), ''),
          source: getTrimmedTextContent(element, 'funding-source'),
        }
      },
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'award',
        id: node.attrs.id,
      },
    ]
  },
}

export const isAwardNode = (node: Node): node is AwardNode =>
  node.type === node.type.schema.nodes.award
