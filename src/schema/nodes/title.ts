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

export interface TitleAttrs {
  id: string
  placeholder: string
}

export interface TitleNode extends Node {
  attrs: TitleAttrs
}

export const title: NodeSpec = {
  content: '(text | highlight_marker)*',
  attrs: {
    id: { default: '' },
    placeholder: { default: 'Insert title here...' },
    dataTracked: { default: null },
  },
  group: 'block element',
  parseDOM: [
    { tag: 'div' },
    {
      tag: 'article-title',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          type: element.getAttribute('type') || '',
        }
      },
    },
  ],
  toDOM: () => ['div', 0],
}

export const isTitleNode = (node: Node): node is TitleNode =>
  node.type === node.type.schema.nodes.title
