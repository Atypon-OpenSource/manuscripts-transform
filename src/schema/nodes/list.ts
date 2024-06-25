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
import { ObjectTypes } from '@manuscripts/json-schema'
import { NodeSpec } from 'prosemirror-model'

import { buildElementClass } from '../../lib/attributes'
import { ManuscriptNode } from '../types'

export type JatsStyleType =
  | 'simple'
  | 'bullet'
  | 'order'
  | 'alpha-lower'
  | 'alpha-upper'
  | 'roman-lower'
  | 'roman-upper'
interface ListTypeInfo {
  type: 'ul' | 'ol'
  style: string
}

export const getListType = (style: JatsStyleType): ListTypeInfo => {
  switch (style) {
    case 'simple':
      return { type: 'ul', style: 'none' }
    case 'bullet':
      return { type: 'ul', style: 'disc' }
    case 'order':
      return { type: 'ul', style: 'decimal' }
    case 'alpha-lower':
      return { type: 'ul', style: 'lower-alpha' }
    case 'alpha-upper':
      return { type: 'ul', style: 'upper-alpha' }
    case 'roman-lower':
      return { type: 'ul', style: 'lower-roman' }
    case 'roman-upper':
      return { type: 'ul', style: 'upper-roman' }
    default:
      throw new Error(`Unsupported style type: ${style}`)
  }
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
        const dom = p as HTMLOListElement

        return {
          id: dom.getAttribute('id'),
          listStyleType: dom.getAttribute('list-type'),
        }
      },
    },
  ],
  toDOM: (node) => {
    const list = node as ListNode
    const { type } = getListType(list.attrs.listStyleType as JatsStyleType)
    return [
      type,
      {
        id: list.attrs.id,
        'list-type': list.attrs.listStyleType,
        class: buildElementClass(list.attrs),
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
