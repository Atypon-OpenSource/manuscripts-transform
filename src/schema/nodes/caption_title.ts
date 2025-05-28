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

export interface CaptionTitleAttrs {
  placeholder: string
}

export interface CaptionTitleNode extends Node {
  attrs: CaptionTitleAttrs
}

export const captionTitle: NodeSpec = {
  content: 'inline*',
  group: 'block',
  selectable: false,
  attrs: {
    placeholder: { default: 'Title...' },
    dataTracked: { default: null },
  },
  parseDOM: [
    {
      tag: 'title',
      context: 'figcaption/',
    },
  ],
  toDOM: (node) => {
    const captionTitleNode = node as CaptionTitleNode

    const attrs: { [key: string]: string } = {}

    attrs.class = 'caption-title'

    if (captionTitleNode.attrs.placeholder) {
      attrs['data-placeholder-text'] = captionTitleNode.attrs.placeholder
    }

    if (!captionTitleNode.textContent) {
      attrs.class = `${attrs.class} placeholder`
    }

    return ['label', attrs, 0]
  },
}

export const isCaptionTitleNode = (node: Node): node is CaptionTitleNode =>
  node.type === node.type.schema.nodes.caption_title
