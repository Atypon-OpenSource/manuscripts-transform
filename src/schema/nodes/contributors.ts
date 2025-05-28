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

import { Node, NodeSpec } from 'prosemirror-model'

// This node has no representation in json-schema
// It exists for the purpose of styling in the UI

export interface ContributorsAttrs {
  id: string
}

export interface ContributorsNode extends Node {
  attrs: ContributorsAttrs
}

export const contributors: NodeSpec = {
  content: 'contributor*',
  attrs: {
    id: { default: '' },
  },
  group: 'block',
  selectable: false,
  toDOM: () => ['div', { class: 'contributors' }, 0],
}

export const isContributorsNode = (node: Node): node is ContributorsNode =>
  node.type === node.type.schema.nodes.contributors
