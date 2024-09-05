/*!
 * © 2024 Atypon Systems LLC
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

import { Manuscript } from '@manuscripts/json-schema'

import { jatsBodyDOMParser } from '../jats/importer/jats-dom-parser'
import { ManuscriptNode } from '../schema'

export const createArticleNode = (manuscript: Manuscript) => {
  const manuuscriptEl = document.createElement('manuscript')
  manuuscriptEl.setAttribute('id', manuscript._id)
  if (manuscript.DOI) {
    manuuscriptEl.setAttribute('DOI', manuscript.DOI)
  }
  if (manuscript.articleType) {
    manuuscriptEl.setAttribute('articleType', manuscript.articleType)
  }
  PageTransitionEvent
  if (manuscript.prototype) {
    manuuscriptEl.setAttribute('prototype', manuscript.prototype)
  }
  if (manuscript.primaryLanguageCode) {
    manuuscriptEl.setAttribute(
      'primaryLanguageCode',
      manuscript.primaryLanguageCode
    )
  }

  const article = document.createElement('article')
  const title = document.createElement('article-title')
  article.appendChild(manuuscriptEl)
  article.appendChild(title)

  return jatsBodyDOMParser.parse(article).firstChild as ManuscriptNode
}
