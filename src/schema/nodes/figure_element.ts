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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'
import { AttributionNode } from './attribution'

export interface FigureElementAttrs {
  id: string
  attribution?: AttributionNode
}

export interface FigureElementNode extends ManuscriptNode {
  attrs: FigureElementAttrs
}

export const figureElement: NodeSpec = {
  content:
    '(paragraph | figure | missing_figure | placeholder)+ attribution* caption alt_text long_desc (listing | placeholder)',
  attrs: {
    id: { default: '' },
    attribution: { default: undefined },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block element executable',
  parseDOM: [
    {
      tag: 'figure.figure-group',
      getAttrs: (p) => {
        const dom = p as HTMLElement

        return {
          id: dom.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const figureElementNode = node as FigureElementNode

    const { id } = figureElementNode.attrs

    const attrs: { [key: string]: string } = {}

    const classes: string[] = ['figure-group']

    attrs.class = classes.join(' ')

    attrs.id = id

    return ['figure', attrs, 0]
  },
}

export const isFigureElementNode = (
  node: ManuscriptNode
): node is FigureElementNode =>
  node.type === node.type.schema.nodes.figure_element
