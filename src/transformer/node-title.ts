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

import { NodeType } from 'prosemirror-model'

import { iterateChildren } from '../lib/utils'
import { isHighlightMarkerNode, schema } from '../schema'
import { ManuscriptNode, ManuscriptNodeType } from '../schema/types'
import { nodeNames } from './node-names'

const textSnippet = (node: ManuscriptNode, max = 100) => {
  let text = ''

  node.forEach((child) => {
    if (child.isText) {
      text += child.text
    } else if (isHighlightMarkerNode(node)) {
      text += ''
    } else {
      text += ' '
    }
  })

  return text.substring(0, max)
}

const snippetOfNodeType = (
  node: ManuscriptNode,
  nodeType: ManuscriptNodeType
) => {
  for (const child of iterateChildren(node, true)) {
    if (child.type === nodeType) {
      return textSnippet(child)
    }
  }

  return null
}

export const nodeTitle = (node: ManuscriptNode) => {
  const nodes = schema.nodes

  switch (node.type) {
    case nodes.manuscript:
      return snippetOfNodeType(node, nodes.title)

    case nodes.section:
    case nodes.bibliography_section:
    case nodes.footnotes_section:
    case nodes.keywords:
    case nodes.graphical_abstract_section:
      return snippetOfNodeType(node, nodes.section_title)

    case nodes.footnotes_element:
      return node.attrs.collateByKind === 'footnote' ? 'Footnotes' : 'Endnotes' // TODO

    case nodes.list:
    case nodes.blockquote_element:
    case nodes.footnote:
    case nodes.pullquote_element:
      return snippetOfNodeType(node, nodes.paragraph)

    case nodes.embed:
    case nodes.figure_element:
    case nodes.table_element:
    case nodes.equation_element:
    case nodes.listing_element:
    case nodes.multi_graphic_figure_element:
    case nodes.image_element:
    case nodes.hero_image:
    case nodes.box_element:
    case nodes.supplements:
    case nodes.attachments:
      return ''

    default:
      return textSnippet(node)
  }
}

export const nodeTitlePlaceholder = (nodeType: NodeType) => {
  const nodes = schema.nodes

  switch (nodeType) {
    case nodes.manuscript:
      return 'Untitled Manuscript'

    case nodes.section:
      return 'Untitled Section'

    case nodes.bibliography_section:
      return 'Bibliography'

    default:
      return nodeNames.get(nodeType) || ''
  }
}
