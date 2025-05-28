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

import { SectionCategory } from './types'

export const isMatchingCategory = (
  secType: string | null,
  titleNode: Element | null,
  category: SectionCategory
): boolean => {
  if (
    (secType && category.synonyms.includes(secType)) ||
    category.id === secType
  ) {
    return true
  }
  if (titleNode && titleNode.nodeName === 'title' && titleNode.textContent) {
    const textContent = titleNode.textContent.trim().toLowerCase()
    if (category.synonyms.includes(textContent)) {
      return true
    }
  }
  return false
}

export const chooseSectionCategory = (
  section: HTMLElement,
  sectionCategories: SectionCategory[]
): string | undefined => {
  const secType = section.getAttribute('sec-type')
  const titleNode = section.firstElementChild

  for (const category of sectionCategories) {
    if (isMatchingCategory(secType, titleNode, category)) {
      return category.id
    }
  }
}
