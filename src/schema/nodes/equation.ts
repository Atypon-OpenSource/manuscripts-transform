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
import { NodeSpec } from 'prosemirror-model'

import { convertTeXToMathML } from '../../mathjax/tex-to-mathml'
import { ManuscriptNode } from '../types'

interface Attrs {
  id: string
  content: string
}

export interface EquationNode extends ManuscriptNode {
  attrs: Attrs
}

export const getEquationContent = (p: string | HTMLElement) => {
  const element = p as HTMLElement
  const container = element.querySelector('alternatives') ?? element
  let content: string | null = ''
  for (const child of container.childNodes) {
    // remove namespace prefix
    // TODO: real namespaces
    const nodeName = child.nodeName.replace(/^[a-z]:/, '')

    switch (nodeName) {
      case 'tex-math':
        content = convertTeXToMathML((child as Element).outerHTML, true)
        break
      case 'mml:math':
        ;(child as Element).removeAttribute('id')
        content = (child as Element).outerHTML
        break
    }
  }
  return {
    id: element.getAttribute('id'),
    content: content,
  }
}

export const equation: NodeSpec = {
  attrs: {
    id: { default: '' },
    content: { default: '' },
    dataTracked: { default: null },
    // placeholder: { default: 'Click to edit equation' },
  },
  group: 'block',
  parseDOM: [
    {
      tag: `div.${ObjectTypes.Equation}`,
      getAttrs: (p) => getEquationContent(p),
    },
    // TODO: convert MathML from pasted math elements?
  ],
  toDOM: (node: ManuscriptNode) => {
    const equationNode = node as EquationNode
    const dom = document.createElement('div')
    dom.setAttribute('id', equationNode.attrs.id)
    dom.innerHTML = equationNode.attrs.content

    return dom
  },
}
