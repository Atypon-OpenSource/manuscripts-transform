/*!
 * © 2023 Atypon Systems LLC
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

import type {
  BibliographyItem,
  Citation,
  CitationItem,
  Model,
} from '@manuscripts/json-schema'
import CiteProc from 'citeproc'
import { Fragment as ManuscriptFragment } from 'prosemirror-model'

import { CitationNode, isCitationNode, ManuscriptNode } from '../schema'

type CitationNodes = Array<[CitationNode, number, Citation]>

export const buildCitations = (
  citationNodes: CitationNodes,
  getLibraryItem: (id: string) => BibliographyItem | undefined
): CiteProc.Citation[] =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  citationNodes.map(([node, pos, citation]) => ({
    citationID: citation._id,
    citationItems: citation.embeddedCitationItems.map(
      (citationItem: CitationItem) => ({
        id: citationItem.bibliographyItem,
        data: getLibraryItem(citationItem.bibliographyItem), // for comparison
      })
    ),
  }))
export const buildBibliographyItems = (
  citationNodes: CitationNodes,
  getLibraryItem: (id: string) => BibliographyItem | undefined
): BibliographyItem[] => {
  const bibliographyItems: BibliographyItem[] = []
  citationNodes.map(([node, pos, citation]) => {
    citation.embeddedCitationItems.map((citationItem: CitationItem) => {
      const libraryItem = getLibraryItem(citationItem.bibliographyItem)
      if (
        !bibliographyItems.some(
          (item) => item._id === citationItem.bibliographyItem
        ) &&
        libraryItem
      ) {
        bibliographyItems.push(libraryItem)
      }
    })
  })

  return bibliographyItems
}

export const buildCitationNodes = (
  doc: ManuscriptFragment,
  modelMap: Map<string, Model>
): CitationNodes => {
  const citationNodes: CitationNodes = []
  const citationIds: string[] = []

  doc.descendants((node: ManuscriptNode, pos: number) => {
    if (isCitationNode(node) && !citationIds.includes(node.attrs.rid)) {
      const citation = modelMap.get(node.attrs.rid) as Citation

      if (citation) {
        citationNodes.push([node, pos, citation])
        citationIds.push(node.attrs.rid)
      }
    }
  })

  return citationNodes
}
