/*!
 * © 2020 Atypon Systems LLC
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

import { Node, NodeType } from 'prosemirror-model'

import { ManuscriptFragment, schema } from '../../schema'
import { nodeNames } from '../../transformer/node-names'

export interface Target {
  type: string
  id: string
  label: string
  caption: string
}

interface Counter {
  label: string
  index: number
}

interface Counters {
  [key: string]: Counter
}

const labelledNodeTypes: NodeType[] = [
  schema.nodes.figure_element,
  schema.nodes.table_element,
  schema.nodes.equation_element,
  schema.nodes.listing_element,
  schema.nodes.box_element,
  schema.nodes.embed,
  schema.nodes.image_element,
]

const excludedTypes = [schema.nodes.graphical_abstract_section]

const chooseLabel = (nodeType: NodeType): string => {
  return nodeNames.get(nodeType) as string
}

export const buildTargets = (
  node: Node | ManuscriptFragment
): Map<string, Target> => {
  const counters: Counters = {}

  for (const nodeType of labelledNodeTypes) {
    counters[nodeType.name] = {
      label: chooseLabel(nodeType), // choosing label name: "Figure", "Table", etc.
      index: 0, // TODO: use manuscript.figureElementNumberingScheme
    }
  }

  const buildLabel = (type: NodeType) => {
    const counter = counters[type.name]
    counter.index++
    return `${counter.label} ${counter.index}`
  }

  const targets: Map<string, Target> = new Map()

  node.descendants((node, pos, parent) => {
    if (node.type.name in counters) {
      if (parent && excludedTypes.includes(parent.type)) {
        return
      }
      if (node.type === schema.nodes.box_element) {
        const child = node.firstChild
        if (!child || child.type !== schema.nodes.figcaption) {
          return
        }
      }
      const label = buildLabel(node.type)

      targets.set(node.attrs.id, {
        type: node.type.name,
        id: node.attrs.id,
        label,
        caption: node.textContent?.trim(), // TODO: HTML?
      })
    }
  })
  return targets
}
