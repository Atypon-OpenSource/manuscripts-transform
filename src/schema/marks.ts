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

import { MarkSpec } from 'prosemirror-model'

import { DataTrackedAttrs } from './types'

export const bold: MarkSpec = {
  parseDOM: [
    {
      // this is to support article-title parsing which is done by creating htmlNode first and putting it through the parser
      tag: 'bold',
    },
    {
      // Google Docs can produce content wrapped in <b style="fontWeight:normal">, which isn't actually bold. This workaround is copied from prosemirror-schema-basic.
      tag: 'b',
      getAttrs: (dom) =>
        (dom as HTMLElement)?.style?.fontWeight !== 'normal' && null,
    },
    { tag: 'strong' },
    {
      // This regex, copied from prosemirror-schema-basic, matches all the possible "font-weight" values that can mean "bold".
      getAttrs: (value) =>
        /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      style: 'font-weight',
    },
  ],
  toDOM: () => ['b'],
}

export const code: MarkSpec = {
  parseDOM: [{ tag: 'code' }],
  toDOM: () => ['code'],
}

export const italic: MarkSpec = {
  parseDOM: [
    { tag: 'italic' },
    { tag: 'i' },
    { tag: 'em' },
    { style: 'font-style=italic' },
  ],
  toDOM: () => ['i'],
}

export const smallcaps: MarkSpec = {
  parseDOM: [
    { tag: 'sc' },
    { style: 'font-variant=small-caps' },
    { style: 'font-variant-caps=small-caps' }, // TODO: all the other font-variant-caps options?
  ],
  toDOM: () => [
    'span',
    {
      style: 'font-variant:small-caps',
    },
  ],
}

export const strikethrough: MarkSpec = {
  parseDOM: [
    { tag: 's' },
    { tag: 'strike' },
    { style: 'text-decoration=line-through' },
    { style: 'text-decoration-line=line-through' },
  ],
  toDOM: () => ['s'],
}

export const styled: MarkSpec = {
  attrs: {
    rid: { default: '' },
  },
  spanning: false,
  parseDOM: [
    {
      tag: 'span.styled-content',
      getAttrs: (dom) => {
        const element = dom as HTMLSpanElement
        return {
          rid: element.getAttribute('data-inline-style'),
        }
      },
    },
    {
      tag: 'styled-content',
      getAttrs: (node) => ({
        style: (node as Element).getAttribute('style'),
      }),
    },
  ],
  toDOM: (mark) => {
    return [
      'span',
      { class: 'styled-content', 'data-inline-style': mark.attrs.rid },
    ]
  },
}

export const subscript: MarkSpec = {
  excludes: 'superscript',
  group: 'position',
  parseDOM: [{ tag: 'sub' }, { style: 'vertical-align=sub' }],
  toDOM: () => ['sub'],
}

export const superscript: MarkSpec = {
  excludes: 'subscript',
  group: 'position',
  parseDOM: [{ tag: 'sup' }, { style: 'vertical-align=super' }],
  toDOM: () => ['sup'],
}

export const underline: MarkSpec = {
  parseDOM: [
    { tag: 'underline' },
    { tag: 'u' },
    { style: 'text-decoration=underline' },
  ],
  toDOM: () => ['u'],
}

export const tracked_insert: MarkSpec = {
  excludes: 'tracked_insert tracked_delete',
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'ins',
      getAttrs: (ins) => {
        const dom = ins as HTMLElement
        return {
          dataTracked: {
            id: dom.getAttribute('data-track-id'),
            userID: dom.getAttribute('data-user-id'),
            status: dom.getAttribute('data-track-status'),
            createdAt: parseInt(
              dom.getAttribute('data-track-created-at') || ''
            ),
          },
        }
      },
    },
  ],
  toDOM: (el) => {
    const dataTracked: Partial<DataTrackedAttrs> = el.attrs.dataTracked || {}
    const { status = 'pending', id, userID, createdAt } = dataTracked
    const attrs = {
      class: `inserted ${status}`,
      'data-track-status': status,
      ...(id && { 'data-track-id': id }),
      ...(userID && { 'data-user-id': userID }),
      ...(createdAt && { 'data-track-created-at': createdAt.toString() }),
    }
    return ['ins', attrs]
  },
}

export const tracked_delete: MarkSpec = {
  excludes: 'tracked_insert tracked_delete',
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'del',
      getAttrs: (del) => {
        const dom = del as HTMLElement
        return {
          dataTracked: {
            id: dom.getAttribute('data-track-id'),
            userID: dom.getAttribute('data-user-id'),
            status: dom.getAttribute('data-track-status'),
            createdAt: parseInt(
              dom.getAttribute('data-track-created-at') || ''
            ),
          },
        }
      },
    },
  ],
  toDOM: (el) => {
    const dataTracked: Partial<DataTrackedAttrs> = el.attrs.dataTracked || {}
    const { status = 'pending', id, userID, createdAt } = dataTracked
    const attrs = {
      class: `deleted ${status}`,
      'data-track-status': status,
      ...(id && { 'data-track-id': id }),
      ...(userID && { 'data-user-id': userID }),
      ...(createdAt && { 'data-track-created-at': createdAt.toString() }),
    }
    return ['del', attrs]
  },
}
