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

import { DOMParser, Fragment, Node, NodeSpec } from 'prosemirror-model'

export interface GeneralTableFootnoteAttrs {
  id: string
}

export interface GeneralTableFootnoteNode extends Node {
  attrs: GeneralTableFootnoteAttrs
}

export const generalTableFootnote: NodeSpec = {
  content: 'paragraph*',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'general-table-footnote',
      context: 'table_element_footer/',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
        }
      },
      getContent: (node, schema) => {
        const parser = DOMParser.fromSchema(schema)
        const paragraphs: Node[] = []
        node.childNodes.forEach((p) => {
          const paragraph = schema.nodes.paragraph.create()
          const content = parser.parse(p, {
            topNode: paragraph,
          })
          paragraphs.push(content)
        })
        return Fragment.from([...paragraphs]) as Fragment
      },
    },
  ],
  toDOM: () => ['div', { class: 'general-table-footnote' }, 0],
}

export const isGeneralTableFootnoteNode = (
  node: Node
): node is GeneralTableFootnoteNode =>
  node.type === node.type.schema.nodes.general_table_footnote
