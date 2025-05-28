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

export interface KeywordGroupAttrs {
  id: string
  type: string
}

export interface KeywordGroupNode extends Node {
  attrs: KeywordGroupAttrs
}

export const keywordGroup: NodeSpec = {
  content: 'keyword*',
  attrs: {
    id: { default: '' },
    type: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.keywords',
    },
    {
      tag: 'kwd-group',
      context: 'keywords_element/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.id,
          type: element.getAttribute('kwd-group-type'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const keywordGroupNode = node as KeywordGroupNode

    return [
      'div',
      {
        id: keywordGroupNode.attrs.id,
        class: 'keywords',
        spellcheck: 'false',
        contenteditable: false,
      },
      0,
    ]
  },
}

export const isKeywordGroupNode = (node: Node): node is KeywordGroupNode =>
  node.type === node.type.schema.nodes.keywords_group
