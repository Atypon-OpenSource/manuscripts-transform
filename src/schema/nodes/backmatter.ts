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

import { Node, NodeSpec } from 'prosemirror-model'

export interface BackmatterAttrs {
  id: string
}

export interface BackmatterNode extends Node {
  attrs: BackmatterAttrs
}
export const backmatter: NodeSpec = {
  content: 'sections*',
  attrs: {
    id: { default: '' },
    placeholder: { default: ' ' },
  },
  group: 'block element',
  parseDOM: [
    { tag: 'div.backmatter' },
    {
      tag: 'sec[sec-type="backmatter"]',
      priority: 100,
    },
  ],
  toDOM: () => ['div', { class: 'backmatter' }, 0],
}

export const isBackmatterNode = (node: Node): node is BackmatterNode =>
  node.type === node.type.schema.nodes.backmatter
