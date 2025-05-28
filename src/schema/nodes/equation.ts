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

import { ObjectTypes } from '@manuscripts/json-schema'
import { Node, NodeSpec } from 'prosemirror-model'

export interface EquationAttrs {
  id: string
  format: string
  contents: string
}

export interface EquationNode extends Node {
  attrs: EquationAttrs
}

export const equation: NodeSpec = {
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    format: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: `div.${ObjectTypes.Equation}`,
      getAttrs: (p) => {
        const htmlEl = p as HTMLElement
        return {
          id: htmlEl.getAttribute('id'),
          format: htmlEl.getAttribute('data-equation-format'),
          contents: htmlEl.innerHTML,
        }
      },
    },
  ],
  toDOM: (node: Node) => {
    const equationNode = node as EquationNode
    const { id, contents, format } = equationNode.attrs

    const dom = document.createElement('div')
    dom.classList.add(ObjectTypes.Equation)
    dom.setAttribute('id', id)
    if (format) {
      dom.setAttribute('data-equation-format', format)
    }
    dom.innerHTML = contents

    return dom
  },
}

export const isEquationNode = (node: Node): node is EquationNode =>
  node.type === node.type.schema.nodes.equation
