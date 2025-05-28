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

export interface CrossReferenceAttrs {
  rids: string[]
  label: string
}

export interface CrossReferenceNode extends Node {
  attrs: CrossReferenceAttrs
}

export const crossReference: NodeSpec = {
  inline: true,
  group: 'inline',
  draggable: true,
  atom: true,
  attrs: {
    rids: { default: [] },
    label: { default: '' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'span.cross-reference',
      getAttrs: (p) => {
        const dom = p as HTMLSpanElement

        return {
          rids: dom.getAttribute('data-reference-id')?.split(/\s+/) || [],
        }
      },
    },
    {
      tag: 'xref',
      node: 'cross_reference',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          rids: element.getAttribute('rid')?.split(/\s+/) || [],
        }
      },
    },
  ],
  toDOM: (node) => {
    const crossReferenceNode = node as CrossReferenceNode

    return [
      'span',
      {
        class: 'cross-reference',
        'data-reference-id': crossReferenceNode.attrs.rids.join(' '),
      },
      crossReferenceNode.attrs.label,
    ]
  },
}

export const isCrossReferenceNode = (node: Node): node is CrossReferenceNode =>
  node.type === node.type.schema.nodes.cross_reference
