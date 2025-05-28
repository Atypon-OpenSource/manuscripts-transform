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

import { Fragment, Node, NodeSpec } from 'prosemirror-model'

export interface EquationElementAttrs {
  id: string
}

const getEquationContent = (p: string | HTMLElement) => {
  const element = p as HTMLElement
  const id = element.getAttribute('id')
  const container = element.querySelector('alternatives') ?? element
  let contents: string | null = ''
  let format: string | null = ''
  for (const child of container.childNodes) {
    const nodeName = child.nodeName.replace(/^[a-z]:/, '')

    switch (nodeName) {
      case 'tex-math':
        contents = child.textContent
        format = 'tex'
        break
      case 'mml:math':
        contents = (child as Element).outerHTML
        format = 'mathml'
        break
    }
  }
  return { id, format, contents }
}
export interface EquationElementNode extends Node {
  attrs: EquationElementAttrs
}

export const equationElement: NodeSpec = {
  content: '(equation | placeholder)',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block element',
  parseDOM: [
    {
      tag: 'div.equation',
      getAttrs: (p) => {
        const dom = p as HTMLElement

        return {
          id: dom.getAttribute('id'),
        }
      },
    },
    {
      tag: 'disp-formula',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
      getContent: (node, schema) => {
        const element = node as HTMLElement
        const attrs = getEquationContent(element)
        return Fragment.from([
          schema.nodes.equation.createChecked({ ...attrs }),
        ]) as Fragment
      },
    },
    {
      tag: 'fig[fig-type=equation]',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const equationElementNode = node as EquationElementNode

    return [
      'div',
      {
        class: 'equation',
        id: equationElementNode.attrs.id,
      },
      0,
    ]
  },
}
export const isEquationElementNode = (
  node: Node
): node is EquationElementNode =>
  node.type === node.type.schema.nodes.equation_element
