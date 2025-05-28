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

// This node has no representation in json-schema
// It exists for the purpose of styling in the UI

export interface CommentsAttrs {
  id: string
}

export interface CommentsNode extends Node {
  attrs: CommentsAttrs
}

export const comments: NodeSpec = {
  content: 'comment*',
  attrs: {
    id: { default: '' },
  },
  parseDOM: [
    {
      tag: 'comments',
    },
  ],
  toDOM: () => ['div', { class: 'comments' }, 0],
}

export const isCommentsNode = (node: Node): node is CommentsNode =>
  node.type === node.type.schema.nodes.comments
