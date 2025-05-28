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

export interface BibliographySectionAttrs {
  id: string
}

export interface BibliographySectionNode extends Node {
  attrs: BibliographySectionAttrs
}

export const bibliographySection: NodeSpec = {
  content: 'section_title bibliography_element',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section.bibliography',
    },
    {
      tag: 'sec[sec-type="bibliography"]',
      priority: 100,
    },
  ],
  toDOM: (node) => {
    const bibliographySectionNode = node as BibliographySectionNode

    return [
      'section',
      {
        id: bibliographySectionNode.attrs.id,
        class: 'bibliography',
        spellcheck: 'false',
      },
      0,
    ]
  },
}

export const isBibliographySectionNode = (
  node: Node
): node is BibliographySectionNode =>
  node.type === node.type.schema.nodes.bibliography_section
