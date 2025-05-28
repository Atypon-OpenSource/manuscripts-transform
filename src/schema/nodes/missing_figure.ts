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

export interface MissingFigureAttrs {
  id: string
}
export interface MissingFigureNode extends Node {
  attrs: MissingFigureAttrs
}

export const missingFigure: NodeSpec = {
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'graphic[specific-use=MISSING]',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
      priority: 100,
    },
  ],
  toDOM: (node) => {
    const missingFigureNode = node as MissingFigureNode

    return [
      'figure',
      {
        class: 'figure',
        id: missingFigureNode.attrs.id,
      },
      0,
    ]
  },
}

export const isMissingFigureNode = (node: Node): node is MissingFigureNode =>
  node.type === node.type.schema.nodes.missing_figure
