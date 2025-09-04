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

import { Mark, MarkSpec } from 'prosemirror-model'

import { DataTrackedAttrs } from './types'

function getTrackedMarkAttrs(el: Mark) {
  const dataTracked: Partial<DataTrackedAttrs> = Array.isArray(
    el.attrs.dataTracked
  )
    ? el.attrs.dataTracked[0]
    : null
  return dataTracked
    ? {
        'data-track-status': dataTracked.status,
        'data-track-op': dataTracked.operation,
      }
    : {}
}

export const bold: MarkSpec = {
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      // Google Docs can produce content wrapped in <b style="fontWeight:normal">, which isn't actually bold. This workaround is copied from prosemirror-schema-basic.
      getAttrs: (dom) =>
        (dom as HTMLElement).style.fontWeight !== 'normal' && null,
      tag: 'b',
    },
    { tag: 'strong' },
    {
      // this is to support article-title parsing which is done by creating htmlNode first and putting it through the parser
      tag: 'bold',
    },
    {
      // This regex, copied from prosemirror-schema-basic, matches all the possible "font-weight" values that can mean "bold".
      getAttrs: (value) =>
        /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      style: 'font-weight',
    },
  ],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['b', attrs]
  },
}

export const code: MarkSpec = {
  parseDOM: [{ tag: 'code' }],
  toDOM: () => ['code'],
}

export const italic: MarkSpec = {
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['i', attrs]
  },
}

export const smallcaps: MarkSpec = {
  parseDOM: [
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
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [
    { tag: 's' },
    { tag: 'strike' },
    { style: 'text-decoration=line-through' },
    { style: 'text-decoration-line=line-through' },
  ],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['s', attrs]
  },
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
  ],
  toDOM: (mark) => {
    return [
      'span',
      { class: 'styled-content', 'data-inline-style': mark.attrs.rid },
    ]
  },
}

export const subscript: MarkSpec = {
  attrs: {
    dataTracked: { default: null },
  },
  excludes: 'superscript',
  group: 'position',
  parseDOM: [{ tag: 'sub' }, { style: 'vertical-align=sub' }],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['sub', attrs]
  },
}

export const superscript: MarkSpec = {
  attrs: {
    dataTracked: { default: null },
  },
  excludes: 'subscript',
  group: 'position',
  parseDOM: [{ tag: 'sup' }, { style: 'vertical-align=super' }],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['sup', attrs]
  },
}

export const underline: MarkSpec = {
  attrs: {
    dataTracked: { default: null },
  },
  parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
  toDOM: (el) => {
    const attrs = {
      ...getTrackedMarkAttrs(el),
    }
    return ['u', attrs]
  },
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
