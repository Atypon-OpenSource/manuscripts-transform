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

export interface BodyAttrs {
  id: string
}

export interface BodyNode extends Node {
  attrs: BodyAttrs
}

export const body: NodeSpec = {
  content: 'element* sections*',
  attrs: {
    id: { default: '' },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'sec[sec-type="body"]',
      priority: 100,
    },
  ],
  toDOM: () => ['div', { class: 'body' }, 0],
}

export const isBodyNode = (node: Node): node is BodyNode =>
  node.type === node.type.schema.nodes.body
