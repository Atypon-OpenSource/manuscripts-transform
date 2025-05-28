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

export interface KeywordsAttrs {
  id: string
}

export interface KeywordsNode extends Node {
  attrs: KeywordsAttrs
}

export const keywords: NodeSpec = {
  content: 'section_title (keywords_element | placeholder_element)',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  selectable: false,
  parseDOM: [
    {
      tag: 'div.keywords',
    },
    {
      tag: 'sec[sec-type="keywords"]',
      priority: 100,
    },
    {
      tag: 'kwd',
      context: 'keyword_group//',
    },
  ],
  toDOM: (node) => {
    const keywords = node as KeywordsNode

    return [
      'div',
      {
        id: keywords.attrs.id,
        class: 'keywords',
        spellcheck: 'false',
        contenteditable: false,
      },
      0,
    ]
  },
}

export const isKeywordsNode = (node: Node): node is KeywordsNode =>
  node.type === node.type.schema.nodes.keywords
