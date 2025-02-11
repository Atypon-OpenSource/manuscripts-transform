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

import { SectionCategory } from '../../schema'
import { JATSArticleBuilder } from './JatsArticleBuilder'

export const parseJATSArticle = (
  doc: Document,
  sectionCategories: SectionCategory[],
  prototype?: string
) => {
  const builder = new JATSArticleBuilder(doc, sectionCategories, prototype)
  const parsers = [
    'title',
    'contributors',
    'affiliations',
    'authorNotes',
    'awards',
    'keywords',
    'supplements',
    'abstracts',
    'body',
    'backmatter',
    'comments',
  ]
  parsers.forEach((type) => builder.addParser(type))
  return builder.build()
}
