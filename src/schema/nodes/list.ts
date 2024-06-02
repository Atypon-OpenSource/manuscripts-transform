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

import { ListElement, ObjectTypes } from '@manuscripts/json-schema'
import { NodeSpec } from 'prosemirror-model'

import { buildElementClass } from '../../lib/attributes'
import { ManuscriptNode } from '../types'

export type JatsStyleType = NonNullable<ListElement['listStyleType']>

export const JATS_HTML_LIST_STYLE_MAPPING: {
  [key in JatsStyleType]: { style: string; type: string }
} = {
  simple: { style: 'none', type: 'ul' },
  bullet: { style: 'disc', type: 'ul' },
  order: { style: 'decimal', type: 'ol' },
  'alpha-lower': { style: 'lower-alpha', type: 'ol' },
  'alpha-upper': { style: 'upper-alpha', type: 'ol' },
  'roman-lower': { style: 'lower-roman', type: 'ol' },
  'roman-upper': { style: 'upper-roman', type: 'ol' },
}

export interface ListNode extends ManuscriptNode {
  attrs: {
    id: string
    paragraphStyle: string
    listStyleType: string
  }
}

export const list: NodeSpec = {
  content: 'list_item+',
  group: 'block list element',
  attrs: {
    id: { default: '' },
    paragraphStyle: { default: '' },
    dataTracked: { default: null },
    listStyleType: { default: null },
  },
  parseDOM: [
    {
      tag: 'ul',
      getAttrs: (p) => {
        const dom = p as HTMLUListElement

        return {
          id: dom.getAttribute('id'),
          listStyleType: dom.getAttribute('list-type'),
        }
      },
    },
    {
      tag: 'ol',
      getAttrs: (p) => {
        const dom = p as HTMLUListElement

        return {
          id: dom.getAttribute('id'),
          listStyleType: dom.getAttribute('list-type'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const ListNode = node as ListNode
    return JATS_HTML_LIST_STYLE_MAPPING[ListNode.attrs.listStyleType as JatsStyleType].type === 'ul'
      ? [
          'ul',
          {
            id: ListNode.attrs.id,
            'list-type': ListNode.attrs.listStyleType,
            class: buildElementClass(ListNode.attrs),
            'data-object-type': ObjectTypes.ListElement,
          },
          0,
        ]
      : [
          'ol',
          {
            id: ListNode.attrs.id,
            'list-type': ListNode.attrs.listStyleType,
            class: buildElementClass(ListNode.attrs),
            'data-object-type': ObjectTypes.ListElement,
          },
          0,
        ]
  },
}

export interface ListItemNode extends ManuscriptNode {
  attrs: {
    placeholder: string
  }
}

export const listItem: NodeSpec = {
  // NOTE: can't mix inline (text) and block content (list)
  // content: 'paragraph list+',
  content: 'paragraph? (paragraph | list)+',
  group: 'block',
  defining: true,
  attrs: {
    placeholder: { default: 'List item' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'li',
      getAttrs: (p) => {
        const dom = p as HTMLLIElement

        return {
          placeholder: dom.getAttribute('data-placeholder-text') || '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const listItemNode = node as ListItemNode

    const attrs: { [key: string]: string } = {}

    if (listItemNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = listItemNode.attrs.placeholder
    }

    return ['li', attrs, 0]
  },
}

export const isListNode = (node: ManuscriptNode): node is ListNode => {
  const { nodes } = node.type.schema

  return node.type === nodes.list
}
