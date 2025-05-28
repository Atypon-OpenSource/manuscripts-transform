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

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export interface LinkAttrs {
  href: string
  title?: string
}

export interface LinkNode extends Node {
  attrs: LinkAttrs
}

export const link: NodeSpec = {
  content: 'inline*',
  attrs: {
    href: { default: '' },
    title: { default: '' },
    dataTracked: { default: null },
  },
  inline: true,
  group: 'inline',
  draggable: true,
  atom: true,
  parseDOM: [
    {
      tag: 'a[href]',
      getAttrs: (a) => {
        const dom = a as HTMLAnchorElement

        return {
          href: dom.getAttribute('href') || '',
          title: dom.getAttribute('title') || '',
        }
      },
    },
    {
      tag: 'span.citation[data-href]',
      getAttrs: (span) => {
        const dom = span as HTMLSpanElement

        return {
          href: dom.getAttribute('data-href') || '',
        }
      },
      priority: 80,
    },
    {
      tag: 'ext-link',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          href: element.getAttributeNS(XLINK_NAMESPACE, 'href') || '',
          title: element.getAttributeNS(XLINK_NAMESPACE, 'title') || '',
        }
      },
    },
  ],
  toDOM: (node) => {
    const { href, title } = node.attrs

    const attrs: { [key: string]: string } = { href }

    if (title) {
      attrs.title = title
    }

    return ['a', attrs, 0]
  },
}

export const isLinkNode = (node: Node): node is LinkNode =>
  node.type === node.type.schema.nodes.link
