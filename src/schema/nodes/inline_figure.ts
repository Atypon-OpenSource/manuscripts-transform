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

import { Node, NodeSpec } from 'prosemirror-model'

export interface InlineFigureAttrs {
  id: string
  src: string
  altText: string
  longDesc: string
}

export interface InlineFigureNode extends Node {
  attrs: InlineFigureAttrs
}

export const inlineFigure: NodeSpec = {
  attrs: {
    id: { default: '' },
    src: { default: '' },
    altText: { default: '' },
    longDesc: { default: '' },
  },
  inline: true,
  group: 'inline',
  toDOM: () => ['span', { class: 'inline-figure' }, 0],
}

export const isInlineFigureNode = (node: Node): node is InlineFigureNode =>
  node.type === node.type.schema.nodes.inline_figure
