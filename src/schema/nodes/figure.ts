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

export interface FigureAttrs {
  id: string
  src: string
  type: string
}

export interface FigureNode extends Node {
  attrs: FigureAttrs
}
const getFigureAttrs = (node: HTMLElement | string | Node) => {
  const element = node as HTMLElement
  const parentElement = element.parentElement
  return {
    id: element.getAttribute('id'),
    type:
      parentElement?.getAttribute('fig-type') ??
      element.getAttribute('content-type') ??
      '',
    src: element.getAttributeNS(XLINK_NAMESPACE, 'href'),
  }
}
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export const figure: NodeSpec = {
  attrs: {
    id: { default: '' },
    src: { default: '' },
    type: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: 'graphic',
      context: 'figure_element/',
      getAttrs: getFigureAttrs,
    },
  ],
  toDOM: (node) => {
    const figureNode = node as FigureNode

    return [
      'figure',
      {
        class: 'figure',
        id: figureNode.attrs.id,
      },
    ]
  },
}

export const isFigureNode = (node: Node): node is FigureNode =>
  node.type === node.type.schema.nodes.figure
