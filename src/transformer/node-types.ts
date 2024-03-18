/*!
 * © 2019 Atypon Systems LLC
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

import {
  GROUP_ELEMENT,
  GROUP_EXECUTABLE,
  GROUP_SECTION,
  hasGroup,
  ManuscriptNode,
  ManuscriptNodeType,
  Nodes,
  schema,
} from '../schema'

export const nodeTypesMap: Map<ManuscriptNodeType, ObjectTypes> = new Map([
  [schema.nodes.abstracts, ObjectTypes.Section],
  [schema.nodes.body, ObjectTypes.Section],
  [schema.nodes.backmatter, ObjectTypes.Section],
  [schema.nodes.comment, ObjectTypes.CommentAnnotation],
  [schema.nodes.bibliography_item, ObjectTypes.BibliographyItem],
  [schema.nodes.bibliography_element, ObjectTypes.BibliographyElement],
  [schema.nodes.bibliography_section, ObjectTypes.Section],
  [schema.nodes.blockquote_element, ObjectTypes.QuoteElement],
  [schema.nodes.bullet_list, ObjectTypes.ListElement],
  [schema.nodes.citation, ObjectTypes.Citation],
  [schema.nodes.equation, ObjectTypes.Equation],
  [schema.nodes.equation_element, ObjectTypes.EquationElement],
  [schema.nodes.figure, ObjectTypes.Figure],
  [schema.nodes.missing_figure, ObjectTypes.MissingFigure],
  [schema.nodes.figure_element, ObjectTypes.FigureElement],
  [schema.nodes.footnote, ObjectTypes.Footnote],
  [schema.nodes.footnotes_element, ObjectTypes.FootnotesElement],
  [schema.nodes.footnotes_section, ObjectTypes.Section],
  [schema.nodes.graphical_abstract_section, ObjectTypes.Section],
  [schema.nodes.highlight_marker, ObjectTypes.HighlightMarker],
  [schema.nodes.keyword, ObjectTypes.Keyword],
  [schema.nodes.keywords_element, ObjectTypes.KeywordsElement],
  [schema.nodes.keywords, ObjectTypes.Section],
  [schema.nodes.keyword_group, ObjectTypes.KeywordGroup],
  [schema.nodes.listing, ObjectTypes.Listing],
  [schema.nodes.listing_element, ObjectTypes.ListingElement],
  [schema.nodes.manuscript, ObjectTypes.Manuscript],
  [schema.nodes.ordered_list, ObjectTypes.ListElement],
  [schema.nodes.paragraph, ObjectTypes.ParagraphElement],
  [schema.nodes.pullquote_element, ObjectTypes.QuoteElement],
  [schema.nodes.section, ObjectTypes.Section],
  [schema.nodes.table, ObjectTypes.Table],
  [schema.nodes.table_element, ObjectTypes.TableElement],
  [schema.nodes.toc_element, ObjectTypes.TOCElement],
  [schema.nodes.toc_section, ObjectTypes.Section],
  [schema.nodes.affiliation, ObjectTypes.Affiliation],
  [schema.nodes.contributor, ObjectTypes.Contributor],
  [schema.nodes.table_element_footer, ObjectTypes.TableElementFooter],
  [schema.nodes.contributors, ObjectTypes.Section],
  [schema.nodes.affiliations, ObjectTypes.Section],
  [schema.nodes.title, ObjectTypes.Titles],
  [schema.nodes.supplement, ObjectTypes.Supplement],
  [schema.nodes.author_notes, ObjectTypes.AuthorNotes],
  [schema.nodes.corresp, ObjectTypes.Corresponding],
])

export const isExecutableNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_EXECUTABLE)

export const isElementNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_ELEMENT)

export const isSectionNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_SECTION)

export const isNodeType = <T extends ManuscriptNode>(
  node: ManuscriptNode,
  type: Nodes
): node is T => node.type === node.type.schema.nodes[type]
