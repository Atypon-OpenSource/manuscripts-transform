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
import { JatsParser } from './parsers/JatsParser'
import { ParserFactory } from './parsers/ParserFactory'
import { JournalProcessor } from './processors/JournalProcessor'

export class JATSArticleBuilder {
  private doc: Document
  private sectionCategories: SectionCategory[]
  private prototype?: string
  private parsers: JatsParser[] = []
  private parserFactory: ParserFactory

  constructor(
    doc: Document,
    sectionCategories: SectionCategory[],
    prototype?: string
  ) {
    this.doc = doc
    this.sectionCategories = sectionCategories
    this.prototype = prototype
    this.parserFactory = new ParserFactory(this.doc, this.sectionCategories)
  }

  addParser(type: string): JATSArticleBuilder {
    this.parsers.push(this.parserFactory.createParser(type))
    return this
  }

  build() {
    const node = this.parserFactory
      .createManuscriptParser(this.parsers, this.prototype)
      .parse()
    const journal = JournalProcessor.parse(this.doc)
    return {
      journal,
      node,
    }
  }
}
