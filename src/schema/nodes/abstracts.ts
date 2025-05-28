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

export interface AbstractsAttrs {
  id: string
}

export interface AbstractsNode extends Node {
  attrs: AbstractsAttrs
}

export const abstracts: NodeSpec = {
  content: 'sections*',
  attrs: {
    id: { default: '' },
  },
  parseDOM: [
    {
      tag: 'sec[sec-type="abstracts"]',
      priority: 100,
    },
  ],
  group: 'block',
  toDOM: () => ['div', { class: 'abstracts' }, 0],
}

export const isAbstractsNode = (node: Node): node is AbstractsNode =>
  node.type === node.type.schema.nodes.abstracts
