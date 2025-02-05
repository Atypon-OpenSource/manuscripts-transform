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

import { schema, SectionCategory } from '../../schema'
import { ParserFactory } from '../parsers/ParserFactory'
import { markComments } from './jats-comments'
import { parseJournal } from './jats-journal-meta-parser'
import { updateDocumentIDs } from './jats-parser-utils'
import {
  addMissingCaptions,
  createBoxedElementSection,
  fixTables,
  moveAcknowledgments,
  moveBackSectionsToStart,
  moveCaptionsToEnd,
  moveFloatsGroupToBody,
  moveFootnotes,
  moveReferencesToBackmatter,
  moveSpecialFootnotes,
  orderTableFootnote,
} from './jats-transformations'

const processJATS = (doc: Document, sectionCategories: SectionCategory[]) => {
  const createElement = createElementFn(doc)
  markComments(doc)
  addMissingCaptions(doc, createElement)
  moveCaptionsToEnd(doc)
  createBoxedElementSection(doc, createElement)
  moveFloatsGroupToBody(doc, createElement)
  moveBackSectionsToStart(doc)
  moveSpecialFootnotes(doc, sectionCategories, createElement)
  moveFootnotes(doc, createElement)
  moveAcknowledgments(doc, createElement)
  fixTables(doc, createElement)
  orderTableFootnote(doc)
  moveReferencesToBackmatter(doc, createElement)
}

const createElementFn = (doc: Document) => (tagName: string) =>
  doc.createElement(tagName)

export const parseJATSArticle = (
  doc: Document,
  sectionCategories: SectionCategory[],
  template?: string
) => {
  const journal = parseJournal(doc)
  processJATS(doc, sectionCategories)

  const factory = new ParserFactory(doc, sectionCategories)

  const titleNode = factory.createTitleParser().parse()
  const contributorsNode = factory
    .createContributorsParser()
    .parse(
      Array.from(
        doc.querySelectorAll('contrib-group > contrib[contrib-type="author"]')
      )
    )

  const affiliationsNode = factory
    .createAffiliationsParser()
    .parse(
      Array.from(doc.querySelectorAll('article-meta > contrib-group > aff'))
    )

  const authorNotesNode = factory
    .createAuthorNotesParser()
    .parse(doc.querySelector('article-meta > author-notes'))
  const awardsNode = factory
    .createAwardsParser()
    .parse(doc.querySelector('article-meta > funding-group'))

  const keywordsNode = factory
    .createKeywordsParser()
    .parse(doc.querySelector('kwd-group'))

  const supplementsNode = factory
    .createSupplementsParser()
    .parse(
      Array.from(doc.querySelectorAll('article-meta > supplementary-material'))
    )

  const abstractsNode = factory
    .createAbstractsParser()
    .parse(Array.from(doc.querySelectorAll('front > article-meta > abstract')))

  const bodyNode = factory.createBodyParser().parse(doc.querySelector('body'))

  const backmatterNode = factory
    .createBackmatterParser()
    .parse(doc.querySelector('back'))

  const content = [
    titleNode,
    contributorsNode,
    affiliationsNode,
    authorNotesNode,
    awardsNode,
    keywordsNode,
    supplementsNode,
    abstractsNode,
    bodyNode,
    backmatterNode,
  ].filter((node) => node !== undefined)

  const node = schema.nodes.manuscript.create({}, content)
  updateDocumentIDs(node)

  return {
    node,
    journal,
  }
}
