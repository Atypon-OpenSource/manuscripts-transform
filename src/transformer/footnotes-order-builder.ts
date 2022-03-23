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

import { FootnotesOrder } from '@manuscripts/manuscripts-json-schema'

import { Build, buildFootnotesOrder } from './builders'

export type FootnotesOrderIndexList = {
  id: string
  index: number
}[]

export class FootnotesOrderBuilder {
  private _indexList: FootnotesOrderIndexList

  private _order: Build<FootnotesOrder>

  constructor() {
    this._indexList = []
  }

  public get indexList() {
    return this._indexList
  }

  public get order() {
    return this._order
  }

  public createFootnoteOrderIndexList(footnotes: Array<Element>) {
    footnotes.forEach((footnote, index) => {
      const fnid = footnote.getAttribute('id')
      if (fnid) {
        this._indexList.push({
          id: fnid,
          index,
        })
      }
    })
  }

  public build(replacements: Map<string, string>) {
    const footnotesOrderIndexList: FootnotesOrderIndexList = []

    this._indexList.forEach((indexObj) => {
      const footnoteID = replacements.get(indexObj.id)
      if (footnoteID) {
        footnotesOrderIndexList.push({
          id: footnoteID,
          index: indexObj.index,
        })
      }
    })

    this._order = buildFootnotesOrder(footnotesOrderIndexList)
  }
}
