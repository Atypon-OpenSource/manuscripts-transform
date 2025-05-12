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

import { htmlFromJatsNode } from '../jats/importer/jats-parser-utils'
import {
  CRediTRole,
  CRediTRoleUrls,
  CreditVocabTerm,
  isBibliographySectionNode,
  isGraphicalAbstractSectionNode,
  ManuscriptEditorState,
  ManuscriptNode,
} from '../schema'

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
    if (predicate(node as ManuscriptNode)) {
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
  selector?: string
) => {
  if (!node) {
    return undefined
  }
  return selector
    ? node.querySelector(selector)?.textContent?.trim()
    : node.textContent?.trim()
}

export const getHTMLContent = (node: Element, querySelector: string) => {
  return htmlFromJatsNode(node.querySelector(querySelector))
}

export const dateToTimestamp = (dateElement: Element) => {
  const selectors = ['year', 'month', 'day']
  const values: Array<number> = []
  for (const selector of selectors) {
    const value = getTrimmedTextContent(dateElement, selector)
    if (!value || isNaN(+value)) {
      return
    }
    values.push(+value)
  }

  // timestamp stored in seconds in manuscript schema
  return Date.UTC(values[0], values[1] - 1, values[2]) / 1000 // ms => s
}

export function getCRediTRoleRole(elem: Element) {
  const sources = elem.querySelectorAll(
    'role[vocab="CRediT"][vocab-identifier="http://credit.niso.org/"][vocab-term][vocab-term-identifier]'
  )
  const results: CRediTRole[] = []
  sources.forEach((source) => {
    if (
      source &&
      CRediTRoleUrls.has(source.getAttribute('vocab-term') as CreditVocabTerm)
    ) {
      const result: CRediTRole = {
        vocabTerm: source.getAttribute('vocab-term') as CreditVocabTerm,
      }
      if (source.getAttribute('degree-contribution')) {
        result.degreeContribution =
          source.getAttribute('degree-contribution') || undefined
      }
      results.push(result)
    }
  })

  return results
}
