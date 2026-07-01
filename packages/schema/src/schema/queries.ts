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

import { ResolvedPos } from 'prosemirror-model'

import { ManuscriptNode } from './types'

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

/**
 * Walk up the ancestors of `$pos` and return the nearest one matching the
 * given node type guard (narrowed to that node's type), or `undefined`.
 * Compose with the per-node guards, e.g.
 *   findAncestor($pos, isGraphicalAbstractSectionNode)
 */
export const findAncestor = <T extends ManuscriptNode>(
  $pos: ResolvedPos,
  predicate: (node: ManuscriptNode) => node is T
): T | undefined => {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth)
    if (predicate(node)) {
      return node
    }
  }
  return undefined
}

/**
 * Whether any ancestor of `$pos` matches the predicate, e.g.
 *   hasAncestor($pos, isGraphicalAbstractSectionNode)
 */
export const hasAncestor = (
  $pos: ResolvedPos,
  predicate: (node: ManuscriptNode) => boolean
): boolean => {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (predicate($pos.node(depth))) {
      return true
    }
  }
  return false
}
