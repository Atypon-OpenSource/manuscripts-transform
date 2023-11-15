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

import { BibliographyItem } from '@manuscripts/json-schema'
import CiteProc from 'citeproc'

import defaultLocale from './defaultLocale'

interface Props {
  bibliographyItemsMap: Map<string, BibliographyItem>
  citationStyle: string
  locale?: string
}

export class CitationProvider {
  private static engine: CiteProc.Engine | null = null
  private constructor() {
    //The constructor is intentionally left empty as part of the Singleton pattern.
  }
  static getEngine(props: Props): CiteProc.Engine {
    if (!CitationProvider.engine) {
      CitationProvider.engine = CitationProvider.createCiteProcEngine(props)
    }

    return CitationProvider.engine
  }
  public static createCiteProcEngine(props: Props) {
    const { bibliographyItemsMap, citationStyle, locale } = props

    return new CiteProc.Engine(
      {
        retrieveItem: (id) =>
          this.retrieveBibliographyItem(id, bibliographyItemsMap),
        retrieveLocale: (): string => locale || defaultLocale,
      },
      citationStyle,
      'en-US',
      false
    )
  }
  private static retrieveBibliographyItem(
    id: string,
    map: Map<string, BibliographyItem>
  ) {
    const item = map.get(id)
    return {
      ...item,
      id,
      type: item?.type || 'article-journal',
    }
  }
  public static recreateEngine(props: Props): CiteProc.Engine {
    CitationProvider.engine = CitationProvider.createCiteProcEngine(props)
    return CitationProvider.engine
  }
  public static generateCitationContent(
    citationID: string,
    citationItems: string[],
    props: Props
  ) {
    const engine = CitationProvider.getEngine(props)
    return engine.previewCitationCluster(
      {
        citationID: citationID,
        citationItems: citationItems,
      },
      [],
      [],
      'text'
    )
  }
}
