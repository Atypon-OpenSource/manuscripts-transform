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

export interface BibliographyElementAttrs {
  id: string
}

export interface BibliographyElementNode extends Node {
  attrs: BibliographyElementAttrs
}

export const bibliographyElement: NodeSpec = {
  content: 'bibliography_item*',
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block element',
  parseDOM: [
    {
      tag: 'div.csl-bib-body',
      getAttrs: () => {
        return {
          contents: '',
        }
      },
    },
    {
      tag: 'ref-list',
      context: 'bibliography_section/',
    },
  ],
  toDOM: () => {
    const dom = document.createElement('div')
    dom.className = 'csl-bib-body'
    return dom
  },
}

export const isBibliographyElementNode = (
  node: Node
): node is BibliographyElementNode =>
  node.type === node.type.schema.nodes.bibliography_element
