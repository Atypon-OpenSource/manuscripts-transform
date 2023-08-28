/*!
 * © 2022 Atypon Systems LLC
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

import { FootnotesOrder } from '@manuscripts/json-schema'

import { buildFootnotesOrder } from './builders'

export type FootnotesOrderIndexList = {
  id: string
  index: number
}[]

export const createOrderedFootnotesIDs = (doc: Document) => {
  const footnotesRefs = [...doc.querySelectorAll('xref[ref-type="fn"][rid]')]
  const footnotes = [...doc.querySelectorAll('fn:not([fn-type])')]

  const authorNotesIDs = [...doc.querySelectorAll('author-notes > fn')].map(
    (an) => an.getAttribute('id')
  )
  const tableFootnotesIDs = [
    ...doc.querySelectorAll('table-wrap-foot > fn'),
  ].map((tableFootnote) => tableFootnote.getAttribute('id'))

  const orderedFootnotesIDs: Array<string> = []
  footnotesRefs.forEach((ref) => {
    const refID = ref.getAttribute('rid')
    if (refID) {
      orderedFootnotesIDs.push(refID)
    }
  })

  footnotes.forEach((footnote) => {
    const id = footnote.getAttribute('id')
    if (
      id &&
      !authorNotesIDs.includes(id) &&
      !orderedFootnotesIDs.includes(id) &&
      !tableFootnotesIDs.includes(id)
    ) {
      orderedFootnotesIDs.push(id)
    }
  })

  return orderedFootnotesIDs
}

export const handleFootnotesOrder = (
  orderedFootnotesIDs: Array<string>,
  replacements: Map<string, string>,
  footnotesOrder: FootnotesOrder
) => {
  const footnotesList: FootnotesOrderIndexList = []
  let index = 0
  orderedFootnotesIDs.forEach((refID) => {
    const fnID = replacements.get(refID)

    if (fnID) {
      footnotesList.push({
        index,
        id: fnID,
      })
      index++
    }
  })

  footnotesOrder.footnotesList = footnotesList
}

export const createEmptyFootnotesOrder = () => buildFootnotesOrder([])
