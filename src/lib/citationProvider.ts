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

import { BibliographyItem } from '@manuscripts/json-schema'
import CiteProc, { Citation as CiteProcCitation } from 'citeproc'
import { isEqual } from 'lodash'

import { convertBibliographyItemToCSL } from './csl-converter'
import defaultLocale from './defaultLocale'

interface Props {
  citationStyle: string
  retrieveItem: (id: string) => CSL.Data
  locale?: string
}

export class CitationProvider {
  private static engine: CiteProc.Engine | null = null
  private static props: Props | null = null
  constructor() {
    //The constructor is intentionally left empty as part of the Singleton pattern.
  }

  public static createCiteProcEngine(props: Props) {
    const { citationStyle, retrieveItem, locale } = props
    CitationProvider.engine = new CiteProc.Engine(
      {
        retrieveItem: retrieveItem,
        retrieveLocale: (): string => locale || defaultLocale,
      },
      citationStyle,
      'en-US',
      false
    )
    CitationProvider.props = { citationStyle, retrieveItem, locale }
  }
  private static rebuildState(
    citations: CiteProcCitation[],
    mode?: 'text' | 'html' | 'rtf',
    uncitedItemIDs?: string[]
  ): Array<[string, number, string]> {
    if (!CitationProvider.engine) {
      throw new Error('CitationProvider.engine is null')
    }
    return CitationProvider.engine.rebuildProcessorState(
      citations,
      mode,
      uncitedItemIDs
    )
  }

  public static rebuildProcessorState(
    citations: CiteProcCitation[],
    bibliographyItems: BibliographyItem[],
    citationStyle: string,
    locale?: string,
    mode?: 'text' | 'html' | 'rtf',
    uncitedItemIDs?: string[]
  ): Array<[string, number, string]> {
    const bibliographyItemsMap = new Map(
      bibliographyItems.map((c) => [c._id, c])
    )
    const retrieveItem = (id: string): CSL.Data => {
      const c = bibliographyItemsMap.get(id)
      if (c) {
        return convertBibliographyItemToCSL(c)
      } else {
        throw Error(`Missing CitationProvider citation with id ${id}`)
      }
    }
    const newProps = {
      citationStyle,
      retrieveItem,
      locale,
    }
    if (
      !CitationProvider.engine ||
      !isEqual(CitationProvider.props, newProps)
    ) {
      this.createCiteProcEngine(newProps)
    }
    return CitationProvider.rebuildState(citations, mode, uncitedItemIDs)
  }
}
