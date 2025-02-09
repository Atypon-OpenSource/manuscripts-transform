/*!
 * © 2025 Atypon Systems LLC
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

import { dateToTimestamp, SectionCategory, trimTextContent } from '../../..'
import { updateDocumentIDs } from '../jats-parser-utils'
import { JatsProcessor } from '../processors/JatsProcessor'
import { JatsParser } from './JatsParser'

export class ManuscriptParser extends JatsParser {
  private readonly parsers: JatsParser[]
  private readonly protoype?: string
  private readonly jatsTransformer: JatsProcessor
  constructor(
    doc: Document,
    parsers: JatsParser[],
    sectionCategories: SectionCategory[],
    protoype?: string
  ) {
    super(doc)
    this.parsers = parsers
    this.protoype = protoype
    this.jatsTransformer = new JatsProcessor(this.doc, sectionCategories)
  }

  private static parseDates = (historyNode: Element | null | undefined) => {
    if (!historyNode) {
      return undefined
    }
    const history: {
      acceptanceDate?: number
      correctionDate?: number
      retractionDate?: number
      revisionRequestDate?: number
      revisionReceiveDate?: number
      receiveDate?: number
    } = {}

    for (const date of historyNode.children) {
      const dateType = date.getAttribute('date-type')
      switch (dateType) {
        case 'received': {
          history.receiveDate = dateToTimestamp(date)
          break
        }
        case 'rev-recd': {
          history.revisionReceiveDate = dateToTimestamp(date)
          break
        }
        case 'accepted': {
          history.acceptanceDate = dateToTimestamp(date)
          break
        }
        case 'rev-request': {
          history.revisionRequestDate = dateToTimestamp(date)
          break
        }
        case 'retracted': {
          history.retractionDate = dateToTimestamp(date)
          break
        }
        case 'corrected': {
          history.correctionDate = dateToTimestamp(date)
          break
        }
      }
    }
    return history
  }

  private getManuscriptAttrs() {
    const article = this.doc.querySelector('article')
    const doi = article?.querySelector(
      'front > article-meta > article-id[pub-id-type="doi"]'
    )
    const history = article?.querySelector('history')
    const dates = ManuscriptParser.parseDates(history)
    return {
      doi: doi ? trimTextContent(doi) : '',
      articleType: article?.getAttribute('article-type') ?? '',
      primaryLanguageCode: article?.getAttribute('lang') ?? '',
      prototype: this.protoype ?? '',
      ...dates,
    }
  }

  parse() {
    this.jatsTransformer.process()
    const content = this.parsers
      .map((parser) => parser.parse())
      .filter((node) => node !== undefined)

    const manuscript = this.schema.nodes.manuscript.create(
      this.getManuscriptAttrs(),
      content
    )
    updateDocumentIDs(manuscript)
    return manuscript
  }
}
