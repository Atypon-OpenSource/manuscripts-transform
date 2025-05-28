/*!
 * © 2025 Atypon Systems LLC
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

import { CRediTRoleUrls, CreditVocabTerm } from '../lib/credit-roles'
import { CRediTRole } from './nodes/contributor'

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

const JATS_TO_HTML_MAPPING = new Map<string, string>([
  ['bold', 'b'],
  ['italic', 'i'],
  ['sc', 'style'], // TODO: style
  ['sub', 'sub'],
  ['sup', 'sup'],
])

export const getHTMLContent = (node: Element, querySelector: string) => {
  return htmlFromJatsNode(node.querySelector(querySelector))
}

export const htmlFromJatsNode = (
  element: Element | undefined | null,
  createElement?: (tagName: string) => HTMLElement
) => {
  if (!element) {
    return undefined
  }
  if (!createElement) {
    createElement = (tagName) => element.ownerDocument.createElement(tagName)
  }
  const temp = createElement('template') as HTMLTemplateElement
  // Interesting fact: template has special semantics that are not same as regular element's
  // In this case unlike normal div, template's HTML has to be accessed via content
  renameJatsNodesToHTML(element, temp, createElement)
  return temp.innerHTML?.trim()
}

const renameJatsNodesToHTML = (
  node: Node,
  container: Node,
  createElement: (tagName: string) => HTMLElement
) => {
  node.childNodes.forEach((childNode) => {
    switch (childNode.nodeType) {
      case Node.ELEMENT_NODE: {
        const newNodeName = JATS_TO_HTML_MAPPING.get(childNode.nodeName)

        if (newNodeName) {
          const newNode = createElement(newNodeName)
          renameJatsNodesToHTML(childNode, newNode, createElement)
          container.appendChild(newNode)
        } else {
          console.warn(`Unhandled node name: ${newNodeName}`)
          container.appendChild(childNode.cloneNode())
        }
        break
      }

      case Node.TEXT_NODE:
      default: {
        container.appendChild(childNode.cloneNode())
        break
      }
    }
  })
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
      results.push(result)
    }
  })

  return results
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
