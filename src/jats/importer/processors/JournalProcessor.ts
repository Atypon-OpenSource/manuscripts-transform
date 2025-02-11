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

import { ObjectTypes } from '@manuscripts/json-schema'

import { trimTextContent } from '../../..'

type ISSN = {
  ISSN: string
  publicationType?: string
}
type AbbreviatedTitle = {
  abbreviatedTitle: string
  abbrevType?: string
}
type JournalIdentifier = {
  journalID: string
  journalIDType?: string
}

class JournalMetaParser {
  private element: Element

  constructor(element: Element) {
    this.element = element
  }

  parse() {
    return {
      abbreviatedTitles: this.parseAbbreviatedTitles(),
      journalIdentifiers: this.parseIdentifiers(),
      ISSNs: this.parseISSNs(),
      publisherName:
        trimTextContent(this.element, 'publisher > publisher-name') ??
        undefined,
      title:
        trimTextContent(this.element, 'journal-title-group > journal-title') ??
        undefined,
    }
  }

  private parseIdentifiers(): JournalIdentifier[] {
    const output: JournalIdentifier[] = []
    const ids = this.element.querySelectorAll('journal-id')
    ids.forEach((id) => {
      const type = id.getAttribute('journal-id-type')
      const value = id.textContent?.trim()
      if (value) {
        output.push({ journalID: value, journalIDType: type ?? undefined })
      }
    })
    return output
  }

  private parseAbbreviatedTitles(): AbbreviatedTitle[] {
    const output: AbbreviatedTitle[] = []
    const titles = this.element.querySelectorAll(
      'journal-title-group > abbrev-journal-title'
    )
    titles.forEach((title) => {
      const type = title.getAttribute('abbrev-type')
      const value = title.textContent?.trim()
      if (value) {
        output.push({ abbreviatedTitle: value, abbrevType: type ?? undefined })
      }
    })
    return output
  }

  private parseISSNs(): ISSN[] {
    const output: ISSN[] = []
    const issns = this.element.querySelectorAll('issn')
    issns.forEach((issn) => {
      const type = issn.getAttribute('pub-type')
      const value = issn.textContent?.trim()
      if (value) {
        output.push({ ISSN: value, publicationType: type ?? undefined })
      }
    })
    return output
  }
}

export class JournalProcessor {
  static parse(doc: Document) {
    const journalMeta = doc.querySelector('journal-meta')
    if (!journalMeta) {
      return
    }
    const meta = new JournalMetaParser(journalMeta).parse()
    return {
      ...meta,
      objectType: ObjectTypes.Journal,
    }
  }
}
