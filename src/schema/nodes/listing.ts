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
import { Node, NodeSpec } from 'prosemirror-model'

import { getTrimmedTextContent } from '../utills'

export interface ListingAttrs {
  id: string
  contents: string
  language: string
  languageKey: string
  isExpanded: boolean
  isExecuting: boolean
}

export interface ListingNode extends Node {
  attrs: ListingAttrs
}

export const listing: NodeSpec = {
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    language: { default: '' },
    languageKey: { default: 'null' },
    isExpanded: { default: false },
    isExecuting: { default: false },
    // placeholder: { default: 'Click to edit listing' },
    dataTracked: { default: null },
  },
  draggable: false,
  selectable: false,
  group: 'block',
  parseDOM: [
    {
      tag: `pre.${ObjectTypes.Listing}`,
      preserveWhitespace: 'full',
      getAttrs: (p) => {
        const node = p as HTMLPreElement

        return {
          contents: node.textContent, // TODO: innerText?
          language: node.getAttribute('language'),
          languageKey: node.getAttribute('languageKey'),
        }
      },
      priority: 100,
    },
    {
      tag: 'pre',
      preserveWhitespace: 'full',
      getAttrs: (p) => {
        const node = p as HTMLPreElement

        return {
          contents: node.getAttribute('code') || node.textContent,
          languageKey: node.getAttribute('language'),
        }
      },
      priority: 90,
    },
    {
      tag: 'code',
      node: 'listing',
      context: 'listing_element/',
      getAttrs: (node) => {
        const element = node as HTMLElement

        return {
          id: element.getAttribute('id'),
          language: element.getAttribute('language') ?? '',
          contents: getTrimmedTextContent(element),
        }
      },
    },
  ],
  toDOM: (node) => {
    const listingNode = node as ListingNode

    const dom = document.createElement('div')
    dom.setAttribute('id', listingNode.attrs.id)
    dom.classList.add(ObjectTypes.Listing)
    dom.setAttribute('data-language', listingNode.attrs.language)
    dom.setAttribute('data-languageKey', listingNode.attrs.languageKey)
    dom.textContent = listingNode.attrs.contents

    return dom
  },
}

export const isListingNode = (node: Node): node is ListingNode =>
  node.type === node.type.schema.nodes.listing
