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

import { Node as ProsemirrorNode, NodeSpec } from 'prosemirror-model'

export interface InlineEquationAttrs {
  id: string
  contents: string
  format: string
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

export interface InlineEquationNode extends ProsemirrorNode {
  attrs: InlineEquationAttrs
}

export const inlineEquation: NodeSpec = {
  attrs: {
    dataTracked: { default: null },
    id: { default: '' },
    contents: { default: '' },
    format: { default: '' },
  },
  atom: true,
  inline: true,
  draggable: true,
  group: 'inline',
  parseDOM: [
    {
      tag: `span.MPInlineMathFragment`,
      getAttrs: (p) => {
        const dom = p as HTMLElement
        return {
          format: dom.getAttribute('data-equation-format'),
          id: dom.getAttribute('id'),
          contents: dom.innerHTML,
        }
      },
    },
    {
      tag: 'inline-formula',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return getEquationContent(element)
      },
    },
  ],
  toDOM: (node) => {
    const inlineEquationNode = node as InlineEquationNode
    const { id, contents, format } = inlineEquationNode.attrs

    const dom = document.createElement('span')
    dom.setAttribute('id', id)
    dom.classList.add('MPInlineMathFragment')
    if (format) {
      dom.setAttribute('data-equation-format', format)
    }
    dom.innerHTML = contents
    return dom
  },
}

export const isInlineEquationNode = (
  node: ProsemirrorNode
): node is InlineEquationNode =>
  node.type === node.type.schema.nodes.inline_equation
