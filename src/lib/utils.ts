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

import { Node as ProsemirrorNode, ResolvedPos } from 'prosemirror-model'

import { ManuscriptEditorState, ManuscriptNode } from '../schema'
import { isBibliographySectionNode } from '../schema/nodes/bibliography_section'
import { isGraphicalAbstractSectionNode } from '../schema/nodes/graphical_abstract_section'

export function* iterateChildren(
  node: ManuscriptNode,
  recurse = false
): Iterable<ManuscriptNode> {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    yield child

    if (recurse) {
      for (const grandchild of iterateChildren(child, true)) {
        yield grandchild
      }
    }
  }
}

export const findNodePositions = (
  state: ManuscriptEditorState,
  predicate: (node: ManuscriptNode) => boolean
) => {
  const found: number[] = []
  state.doc.descendants((node, nodePos) => {
    // @ts-ignore
    if (predicate(node)) {
      found.push(nodePos)
    }
    return true
  })
  return found
}

export const isInGraphicalAbstractSection = ($pos: ResolvedPos): boolean => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i)
    if (isGraphicalAbstractSectionNode(node)) {
      return true
    }
  }
  return false
}

export const isInBibliographySection = ($pos: ResolvedPos): boolean => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i)
    if (isBibliographySectionNode(node)) {
      return true
    }
  }
  return false
}

export const findParentNodeClosestToPos = (
  $pos: ResolvedPos,
  predicate: (node: ProsemirrorNode) => boolean
) => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i)
    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node,
      }
    }
  }
}

export const getTrimmedTextContent = (
  node: Element | Document | null,
  querySelector: string
) => {
  if (!node) {
    return null
  }
  return node.querySelector(querySelector)?.textContent?.trim()
}
