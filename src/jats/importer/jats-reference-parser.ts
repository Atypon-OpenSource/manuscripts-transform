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

import { ObjectTypes } from '@manuscripts/json-schema'

import { getTrimmedTextContent } from '../../lib/utils'
import {
  BibliographyItemAttributes,
  BibliographyItemAuthor,
} from '../../schema'
import { generateID } from '../../transformer'
import { htmlFromJatsNode } from './jats-parser-utils'
import { References } from './jats-references'

const chooseBibliographyItemType = (publicationType: string | null) => {
  switch (publicationType) {
    case 'book':
    case 'thesis':
      return publicationType
    case 'journal':
    default:
      return 'article-journal'
  }
}

export const jatsReferenceParser = {
  parseReferences(
    elements: Element[],
    createElement: (tagName: string) => HTMLElement
  ): References {
    const references = new References()
    elements.forEach((element) => {
      const publicationType = element.getAttribute('publication-type')

      const authorNodes = [
        ...element.querySelectorAll(
          'person-group[person-group-type="author"] > *'
        ),
      ]

      const bibliographyItem: BibliographyItemAttributes = {
        id: generateID(ObjectTypes.BibliographyItem),
        type: chooseBibliographyItemType(publicationType),
      }
      const titleNode = element.querySelector('article-title')
      if (titleNode) {
        bibliographyItem.title = htmlFromJatsNode(
          titleNode,
          createElement
        )?.trim()
      }

      const mixedCitation = element.querySelector('mixed-citation')

      if (authorNodes.length <= 0) {
        mixedCitation?.childNodes.forEach((item) => {
          if (
            item.nodeType === Node.TEXT_NODE &&
            item.textContent?.match(/[A-Za-z]+/g)
          ) {
            bibliographyItem.literal = mixedCitation.textContent?.trim() ?? ''
            return bibliographyItem
          }
        })
      }
      const source = getTrimmedTextContent(element, 'source')

      if (source) {
        bibliographyItem.containerTitle = source
      }

      const volume = getTrimmedTextContent(element, 'volume')
      if (volume) {
        bibliographyItem.volume = volume
      }

      const issue = getTrimmedTextContent(element, 'issue')

      if (issue) {
        bibliographyItem.issue = issue
      }

      const supplement = getTrimmedTextContent(element, 'supplement')

      if (supplement) {
        bibliographyItem.supplement = supplement
      }

      const fpage = getTrimmedTextContent(element, 'fpage')

      const lpage = getTrimmedTextContent(element, 'lpage')

      if (fpage) {
        bibliographyItem.page = lpage ? `${fpage}-${lpage}` : fpage
      }

      const year = getTrimmedTextContent(element, 'year')

      if (year) {
        bibliographyItem.issued = {
          'date-parts': [[year]],
          _id: generateID(ObjectTypes.BibliographicDate),
          objectType: ObjectTypes.BibliographicDate,
        }
      }

      const doi = getTrimmedTextContent(element, 'pub-id[pub-id-type="doi"]')

      if (doi) {
        bibliographyItem.doi = doi
      }

      const authors: BibliographyItemAuthor[] = []

      authorNodes.forEach((authorNode) => {
        const name: BibliographyItemAuthor = {
          _id: generateID(ObjectTypes.BibliographicName),
          objectType: ObjectTypes.BibliographicName,
        }
        const given = getTrimmedTextContent(authorNode, 'given-names')
        if (given) {
          name.given = given
        }
        const family = getTrimmedTextContent(authorNode, 'surname')

        if (family) {
          name.family = family
        }

        if (authorNode.nodeName === 'collab') {
          name.literal = authorNode.textContent?.trim()
        }
        authors.push(name)
      })

      if (authors.length) {
        bibliographyItem.author = authors
      }
      const id = element.getAttribute('id')
      references.add(bibliographyItem, id)
    })
    return references
  },
}
