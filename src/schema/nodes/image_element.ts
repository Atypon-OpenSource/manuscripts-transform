/*!
 * © 2024 Atypon Systems LLC
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
import {
  DOMParser,
  Fragment,
  Node as ProsemirrorNode,
  NodeSpec,
  Schema,
} from 'prosemirror-model'

export interface ImageElementAttrs {
  id: string
}
export interface ImageElementNode extends ProsemirrorNode {
  attrs: ImageElementAttrs
}

const getFigContent = (node: Node, schema: Schema) => {
  const parser = DOMParser.fromSchema(schema)
  const element = node as HTMLElement
  const content = [schema.nodes.figure.create(getFigureAttrs(element))]
  const altText = element.querySelector('alt-text')
  if (altText) {
    const altTextNode = schema.nodes.alt_text.create()
    content.push(parser.parse(altText, { topNode: altTextNode }))
  }
  const longDesc = element.querySelector('long-desc')
  if (longDesc) {
    const longDescNode = parser.schema.nodes.long_desc.create()
    content.push(parser.parse(longDesc, { topNode: longDescNode }))
  }
  return Fragment.from(content)
}
const getFigureAttrs = (node: HTMLElement | string | Node) => {
  const element = node as HTMLElement
  const parentElement = element.parentElement
  return {
    id: element.getAttribute('id'),
    type:
      parentElement?.getAttribute('fig-type') ??
      element.getAttribute('content-type') ??
      '',
    src: element.getAttributeNS(XLINK_NAMESPACE, 'href'),
  }
}
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export const imageElement: NodeSpec = {
  content: 'figure? alt_text long_desc',
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  parseDOM: [
    {
      tag: 'graphic',
      getContent: getFigContent,
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        class: 'image_element',
        id: node.attrs.id,
      },
    ]
  },
}

export const isImageElementNode = (
  node: ProsemirrorNode
): node is ImageElementNode =>
  node.type === node.type.schema.nodes.image_element
