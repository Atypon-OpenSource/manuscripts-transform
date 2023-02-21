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

import { schema } from '../schema'
import { ManuscriptNodeType } from '../schema/types'

export const nodeNames: Map<ManuscriptNodeType, string> = new Map([
  [schema.nodes.bibliography_element, 'Bibliography'],
  [schema.nodes.bibliography_section, 'Section'],
  [schema.nodes.citation, 'Citation'],
  [schema.nodes.listing_element, 'Listing'],
  [schema.nodes.cross_reference, 'Cross Reference'],
  [schema.nodes.equation_element, 'Equation'],
  [schema.nodes.figure_element, 'Figure'],
  [schema.nodes.footnote, 'Footnote'],
  [schema.nodes.footnotes_element, 'Notes'],
  // [schema.nodes.figure, 'Figure'],
  [schema.nodes.bullet_list, 'Bullet List'],
  [schema.nodes.ordered_list, 'Ordered List'],
  [schema.nodes.manuscript, 'Manuscript'],
  [schema.nodes.paragraph, 'Paragraph'],
  [schema.nodes.section, 'Section'],
  [schema.nodes.section_title, 'Section'],
  [schema.nodes.section_title_plain, 'Section'],
  [schema.nodes.table, 'Table'],
  [schema.nodes.table_element, 'Table'],
  [schema.nodes.blockquote_element, 'Block Quote'],
  [schema.nodes.pullquote_element, 'Pull Quote'],
  [schema.nodes.keywords_section, 'Section'],
  [schema.nodes.toc_section, 'Section'],
])
