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

import { getHTMLContent, getTrimmedTextContent } from '../utills'

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export interface SupplementAttrs {
  id: string
  href: string
  mimeType: string
  mimeSubType: string
  title: string
}

export interface SupplementNode extends Node {
  attrs: SupplementAttrs
}

export const supplement: NodeSpec = {
  attrs: {
    id: { default: '' },
    href: { default: '' },
    mimeType: { default: '' },
    mimeSubType: { default: '' },
    title: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'div.supplement',
      getAttrs: (dom) => {
        const el = dom as HTMLElement
        const id = el.getAttribute('id')
        const href = el.getAttribute('href')
        const mimeType = el.getAttribute('mimeType')
        const mimeSubType = el.getAttribute('mimeSubType')
        const title = el.textContent
        return {
          id,
          href,
          mimeType,
          mimeSubType,
          title,
        }
      },
    },
    {
      tag: 'supplementary-material',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          href: element.getAttributeNS(XLINK_NAMESPACE, 'href'),
          mimeType: element.getAttribute('mimetype'),
          mimeSubType: element.getAttribute('mime-subtype'),
          title: getTrimmedTextContent(element, 'title'),
        }
      },
      priority: 100,
    },
  ],
  toDOM: (node) => {
    const supplement = node as SupplementNode

    return [
      'div',
      {
        id: supplement.attrs.id,
        class: 'Supplement',
        href: node.attrs.href,
        mimeType: node.attrs.mimeType,
        mimeSubType: node.attrs.mimeSubType,
        title: node.attrs.title,
      },
    ]
  },
}

export const isSupplementNode = (node: Node): node is SupplementNode =>
  node.type === node.type.schema.nodes.supplement
