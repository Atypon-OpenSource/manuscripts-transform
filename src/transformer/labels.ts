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

import { Manuscript } from '@manuscripts/manuscripts-json-schema'
import { Fragment } from 'prosemirror-model'

import { isInGraphicalAbstractSection } from '../lib/utils'
import { ManuscriptFragment, ManuscriptNodeType, schema } from '../schema'
import { nodeNames } from './node-names'

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

const labelledNodeTypes: ManuscriptNodeType[] = [
  schema.nodes.figure_element,
  schema.nodes.table_element,
  schema.nodes.equation_element,
  schema.nodes.listing_element,
  schema.nodes.multi_graphic_figure_element,
]

const labelProperties: Map<
  ManuscriptNodeType,
  keyof Partial<Manuscript>
> = new Map([
  [schema.nodes.figure_element, 'figureElementLabel'],
  [schema.nodes.multi_graphic_figure_element, 'figureElementLabel'],
  [schema.nodes.table_element, 'tableElementLabel'],
  [schema.nodes.equation_element, 'equationElementLabel'],
  [schema.nodes.listing_element, 'listingElementLabel'],
])

const chooseLabel = (
  nodeType: ManuscriptNodeType,
  manuscript: Manuscript
): string => {
  const labelProperty = labelProperties.get(nodeType)

  if (labelProperty) {
    const label = manuscript[labelProperty]

    if (label) {
      return label as string
    }
  }

  return nodeNames.get(nodeType) as string
}

export const buildTargets = (
  fragment: ManuscriptFragment,
  manuscript: Manuscript
): Map<string, Target> => {
  const counters: Counters = {}

  for (const nodeType of labelledNodeTypes) {
    counters[nodeType.name] = {
      label: chooseLabel(nodeType, manuscript), // choosing label name: "Figure", "Table", etc.
      index: 0, // TODO: use manuscript.figureElementNumberingScheme
    }
  }

  const buildLabel = (type: ManuscriptNodeType) => {
    const viewLabel =
      type === schema.nodes.multi_graphic_figure_element
        ? schema.nodes.figure_element
        : type
    const counter = counters[viewLabel.name]
    counter.index++
    return `${counter.label} ${counter.index}`
  }

  const targets: Map<string, Target> = new Map()

  const resolveInFragment = (fragment: Fragment, pos: number) => {
    let resolved
    fragment.descendants((n) => {
      try {
        resolved = n.resolve(pos)
      } catch (e) {
        return false
      }
      return false
    })
    return resolved
  }

  fragment.descendants((node, pos) => {
    if (node.type.name in counters) {
      const resolvedPos = resolveInFragment(fragment, pos)
      if (resolvedPos) {
        const isInGraphicalAbstract = isInGraphicalAbstractSection(resolvedPos)
        if (isInGraphicalAbstract) {
          return
        }
      }
      const label = buildLabel(node.type)

      targets.set(node.attrs.id, {
        type: node.type.name,
        id: node.attrs.id,
        label,
        caption: node.textContent, // TODO: HTML?
      })

      // TODO: allow an individual figure to be referenced
      // if (node.attrs.containedObjectIDs) {
      //   node.attrs.containedObjectIDs.forEach((containedObjectID: string) => {
      //     targets.set(containedObjectID, {
      //       type: '',
      //       id: containedObjectID,
      //       label,
      //       caption: '',
      //     })
      //   })
      // }
    }
  })
  return targets
}
