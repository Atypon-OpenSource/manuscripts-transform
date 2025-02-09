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

import { SectionCategory } from '../../../schema'
import { AbstractsParser } from './AbstractsParser'
import { AffiliationsParser } from './AffiliationsParser'
import { AuthorNotesParser } from './AuthorNotesParser'
import { AwardsParser } from './AwardsParser'
import { BackmatterParser } from './BackmatterParser'
import { BodyParser } from './BodyParser'
import { CommentsParser } from './CommentsParser'
import { ContributorsParser } from './ContributorsParser'
import { JatsParser } from './JatsParser'
import { KeywordsParser } from './KeywordsParser'
import { ManuscriptParser } from './ManuscriptParser'
import { SupplementsParser } from './SupplementsParser'
import { TitleParser } from './TitleParser'

export class ParserFactory {
  constructor(
    private readonly doc: Document,
    private readonly sectionCategories: SectionCategory[]
  ) {}
  createParser(type: string) {
    switch (type) {
      case 'abstracts':
        return new AbstractsParser(this.doc, this.sectionCategories)
      case 'affiliations':
        return new AffiliationsParser(this.doc)
      case 'authorNotes':
        return new AuthorNotesParser(this.doc)
      case 'awards':
        return new AwardsParser(this.doc)
      case 'backmatter':
        return new BackmatterParser(this.doc, this.sectionCategories)
      case 'body':
        return new BodyParser(this.doc, this.sectionCategories)
      case 'comments':
        return new CommentsParser(this.doc)
      case 'contributors':
        return new ContributorsParser(this.doc)
      case 'keywords':
        return new KeywordsParser(this.doc)
      case 'supplements':
        return new SupplementsParser(this.doc)
      case 'title':
        return new TitleParser(this.doc)
      default:
        throw new Error(`Unknown parser type: ${type}`)
    }
  }
  createManuscriptParser(parsers: JatsParser[], prototype?: string) {
    return new ManuscriptParser(
      this.doc,
      parsers,
      this.sectionCategories,
      prototype
    )
  }
}
