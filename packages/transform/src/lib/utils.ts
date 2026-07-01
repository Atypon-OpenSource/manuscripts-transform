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

import {
  CreditRole,
  CreditRoleUrls,
  CreditVocabTerm,
} from '@manuscripts/schema'

import { htmlFromJatsNode } from '../jats/importer/jats-parser-utils'

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

export function getCreditRole(elem: Element) {
  const sources = elem.querySelectorAll(
    'role[vocab="CRediT"][vocab-identifier="http://credit.niso.org/"][vocab-term][vocab-term-identifier]'
  )
  const results: CreditRole[] = []
  sources.forEach((source) => {
    if (
      source &&
      CreditRoleUrls.has(source.getAttribute('vocab-term') as CreditVocabTerm)
    ) {
      const result: CreditRole = {
        vocabTerm: source.getAttribute('vocab-term') as CreditVocabTerm,
      }
      results.push(result)
    }
  })

  return results
}
