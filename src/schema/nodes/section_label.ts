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

export interface SectionLabelNode extends Node {
  attrs: Record<string, unknown>
}

export const sectionLabel: NodeSpec = {
  content: 'inline*',
  group: 'block',
  attrs: { dataTracked: { default: null } },
  selectable: false,
  parseDOM: [
    {
      tag: 'label',
      context: 'section/',
      node: 'section_label',
    },
    { tag: 'label' },
  ],
  toDOM() {
    return ['label', 0]
  },
}

export const isSectionLabelNode = (node: Node): node is SectionLabelNode =>
  node.type === node.type.schema.nodes.section_label
