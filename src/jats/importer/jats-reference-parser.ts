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

import { BibliographicName, BibliographyItem } from '@manuscripts/json-schema'

import { getTrimmedTextContent } from '../../lib/utils'
import {
  buildBibliographicDate,
  buildBibliographicName,
  buildBibliographyItem,
} from '../../transformer/builders'
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

      const bibliographyItem = buildBibliographyItem({
        type: chooseBibliographyItemType(publicationType),
      })

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
        bibliographyItem['container-title'] = source
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
        bibliographyItem.issued = buildBibliographicDate({
          'date-parts': [[year]],
        })
      }

      const doi = getTrimmedTextContent(element, 'pub-id[pub-id-type="doi"]')

      if (doi) {
        bibliographyItem.DOI = doi
      }

      // TODO: handle missing person-group-type?
      // TODO: handle contrib-group nested inside collab
      // TODO: handle collab name

      const authors: BibliographicName[] = []

      authorNodes.forEach((authorNode) => {
        const name = buildBibliographicName({})

        const given = getTrimmedTextContent(authorNode, 'given-names')

        if (given) {
          name.given = given
        }

        const family = getTrimmedTextContent(authorNode, 'surname')

        if (family) {
          name.family = family
        }

        const suffix = getTrimmedTextContent(authorNode, 'suffix')

        if (suffix) {
          name.suffix = suffix
        }

        if (authorNode.nodeName === 'collab') {
          name.literal = authorNode.textContent?.trim()
        }

        authors.push(name)
      })

      if (authors.length) {
        bibliographyItem.author = authors
      }

      // TODO: handle `etal`?

      const id = element.getAttribute('id')
      references.add(bibliographyItem as BibliographyItem, id)
    })
    return references
  },
}
