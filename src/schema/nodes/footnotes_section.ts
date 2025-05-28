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

export interface FootnotesSectionAttrs {
  id: string
}

export interface FootnotesSectionNode extends Node {
  attrs: FootnotesSectionAttrs
}

export const footnotesSection: NodeSpec = {
  content: 'section_title footnotes_element?',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.footnotes',
    },
    {
      tag: 'sec[sec-type="endnotes"]',
      node: 'footnotes_section',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
        }
      },
      priority: 100,
    },
  ],
  toDOM: (node) => {
    const footnotesSectionNode = node as FootnotesSectionNode

    return [
      'section',
      {
        id: footnotesSectionNode.attrs.id,
        class: 'footnotes',
      },
      0,
    ]
  },
}

export const isFootnotesSectionNode = (
  node: Node
): node is FootnotesSectionNode =>
  node.type === node.type.schema.nodes.footnotes_section
