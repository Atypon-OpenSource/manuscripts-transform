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

export interface KeywordsElementAttrs {
  id: string
  contents: string
}

export interface KeywordsElementNode extends Node {
  attrs: KeywordsElementAttrs
}

export const keywordsElement: NodeSpec = {
  atom: true,
  content: 'keyword_group*',
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.manuscript-keywords',
      getAttrs: (div) => {
        const dom = div as HTMLDivElement

        return {
          contents: dom.innerHTML,
        }
      },
    },
    {
      tag: 'kwd-group-list',
      context: 'keywords/',
    },
  ],
  toDOM: (node) => {
    const keywordsElementNode = node as KeywordsElementNode

    return [
      'div',
      {
        class: 'manuscript-keywords',
        id: keywordsElementNode.attrs.id,
      },
      0,
    ]
  },
}

export const isKeywordsElementNode = (
  node: Node
): node is KeywordsElementNode =>
  node.type === node.type.schema.nodes.keywords_element
