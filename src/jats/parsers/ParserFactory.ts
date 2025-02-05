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
import { SectionCategory } from '../../schema'
import { AbstractsParser } from './AbstractsParser'
import { AffiliationsParser } from './AffiliationsParser'
import { AuthorNotesParser } from './AuthorNotesParser'
import { AwardsParser } from './AwardsParser'
import { BackmatterParser } from './BackmatterParser'
import { BodyParser } from './BodyParser'
import { ContributorsParser } from './ContributorsParser'
import { KeywordsParser } from './KeywordsParser'
import { SupplementsParser } from './SupplementsParser'
import { TitleParser } from './TitleParser'

export class ParserFactory {
  constructor(
    private doc: Document,
    private sectionCategories: SectionCategory[]
  ) {}

  createAbstractsParser() {
    return new AbstractsParser(this.doc, this.sectionCategories)
  }

  createAffiliationsParser() {
    return new AffiliationsParser(this.doc)
  }

  createAuthorNotesParser() {
    return new AuthorNotesParser(this.doc)
  }

  createAwardsParser() {
    return new AwardsParser(this.doc)
  }

  createBackmatterParser() {
    return new BackmatterParser(this.doc, this.sectionCategories)
  }

  createBodyParser() {
    return new BodyParser(this.doc, this.sectionCategories)
  }

  createContributorsParser() {
    return new ContributorsParser(this.doc)
  }

  createKeywordsParser() {
    return new KeywordsParser(this.doc)
  }

  createSupplementsParser() {
    return new SupplementsParser(this.doc)
  }

  createTitleParser() {
    return new TitleParser(this.doc)
  }
}
