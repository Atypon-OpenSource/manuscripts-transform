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

import { BibliographicName } from '@manuscripts/json-schema'

import { getTrimmedTextContent } from '../../lib/utils'
import {
  buildAuxiliaryObjectReference,
  buildBibliographicDate,
  buildBibliographicName,
  buildBibliographyItem,
  buildCitation,
} from '../../transformer/builders'
import { parseProcessingInstruction } from './jats-comments'
import { flatten, htmlFromJatsNode } from './jats-parser-utils'

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
    referenceNodes: Element[],
    createElement: (tagName: string) => HTMLElement
  ) {
    const referenceIDs = new Map<string, string>()
    const referenceQueries = new Map<string, string[]>()
    const references = referenceNodes.map((referenceNode) => {
      const publicationType = referenceNode.getAttribute('publication-type')

      const authorNodes = [
        ...referenceNode.querySelectorAll(
          'person-group[person-group-type="author"] > *'
        ),
      ]

      const bibliographyItem = buildBibliographyItem({
        type: chooseBibliographyItemType(publicationType),
      })

      const titleNode = referenceNode.querySelector('article-title')

      if (titleNode) {
        bibliographyItem.title = htmlFromJatsNode(
          titleNode,
          createElement
        )?.trim()
      }

      const queriesText: string[] = []
      const mixedCitation = referenceNode.querySelector('mixed-citation')
      mixedCitation?.childNodes.forEach((item) => {
        // This isn't the best place but since we are already iterating the nodes it is better for performance
        if (
          item.nodeType === item.PROCESSING_INSTRUCTION_NODE &&
          item.nodeName === 'AuthorQuery'
        ) {
          const instruction = parseProcessingInstruction(item)
          if (instruction) {
            const { queryText } = instruction
            queriesText.push(queryText)
          }
        }
      })
      if (queriesText.length) {
        referenceQueries.set(bibliographyItem._id, queriesText)
      }
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

      const source = getTrimmedTextContent(referenceNode, 'source')

      if (source) {
        bibliographyItem['container-title'] = source
      }

      const volume = getTrimmedTextContent(referenceNode, 'volume')

      if (volume) {
        bibliographyItem.volume = volume
      }

      const issue = getTrimmedTextContent(referenceNode, 'issue')

      if (issue) {
        bibliographyItem.issue = issue
      }

      const supplement = getTrimmedTextContent(referenceNode, 'supplement')

      if (supplement) {
        bibliographyItem.supplement = supplement
      }

      const fpage = getTrimmedTextContent(referenceNode, 'fpage')

      const lpage = getTrimmedTextContent(referenceNode, 'lpage')

      if (fpage) {
        bibliographyItem.page = lpage ? `${fpage}-${lpage}` : fpage
      }

      const year = getTrimmedTextContent(referenceNode, 'year')

      if (year) {
        bibliographyItem.issued = buildBibliographicDate({
          'date-parts': [[year]],
        })
      }

      const doi = getTrimmedTextContent(
        referenceNode,
        'pub-id[pub-id-type="doi"]'
      )

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

      const id = referenceNode.getAttribute('id')

      if (id) {
        referenceIDs.set(id, bibliographyItem._id)
      }
      // TODO: handle `etal`?
      return bibliographyItem
    })
    return {
      references,
      referenceIDs,
      referenceQueries,
    }
  },
  /**
   * Parses cross-references (xref) from the body.
   * Be aware that it most likely mutates the original document (transforms the ids to Manuscript IDs)
   * @param crossReferenceNodes
   * @param referenceIDs
   * @returns
   */
  parseCrossReferences(
    crossReferenceNodes: Element[],
    referenceIDs: Map<string, string>
  ) {
    return flatten(
      crossReferenceNodes.map((crossReferenceNode) => {
        const rid = crossReferenceNode.getAttribute('rid')
        if (!rid) {
          return []
        }
        const modelNodes = []
        const refType = crossReferenceNode.getAttribute('ref-type')
        switch (refType) {
          case 'bibr':
            {
              const rids = rid
                .split(/\s+/)
                .filter((id) => referenceIDs.has(id))
                .map((id) => referenceIDs.get(id)) as string[]

              if (rids.length) {
                const citation = buildCitation('', rids) // TODO: closest id

                modelNodes.push(citation)

                crossReferenceNode.setAttribute('rid', citation._id)
                crossReferenceNode.setAttribute(
                  'data-reference-embedded-citation',
                  JSON.stringify(citation.embeddedCitationItems)
                )
              } else {
                crossReferenceNode.removeAttribute('rid')
              }
            }
            break

          case 'fn':
            // 1. Create a footnotes section if isnt created yet
            // 2. Create a footnote and populate with the content
            // const footnote = buildFootnote('footnote')
            // addModel(footnote)
            //doc.querySelectorAll(`fn[id=${rid}]`)
            break
          default:
            {
              const rids = rid.trim().split(/\s+/)
              const auxiliaryObjectReference = buildAuxiliaryObjectReference(
                '', // TODO: closest id
                rids // TODO: new figure id
              )

              modelNodes.push(auxiliaryObjectReference)

              crossReferenceNode.setAttribute(
                'rid',
                auxiliaryObjectReference._id
              )
            }
            break
        }
        return modelNodes
      })
    )
  },
}
