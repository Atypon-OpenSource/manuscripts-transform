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

import { ManuscriptNode } from '../../schema'
import { jatsBodyDOMParser } from './jats-dom-parser'

export const createArticleNode = (manuscript: Manuscript) => {
  const manuscriptEl = createManuscriptElement(manuscript)
  const article = document.createElement('article')
  const title = document.createElement('article-title')
  article.appendChild(manuscriptEl)
  article.appendChild(title)

  return jatsBodyDOMParser.parse(article).firstChild as ManuscriptNode
}

export const createManuscriptElement = (manuscript: Manuscript) => {
  const manuscriptEl = document.createElement('manuscript')
  manuscriptEl.setAttribute('id', manuscript._id)

  const attributes = {
    DOI: manuscript.DOI,
    articleType: manuscript.articleType,
    prototype: manuscript.prototype,
    primaryLanguageCode: manuscript.primaryLanguageCode,
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value) {
      manuscriptEl.setAttribute(key, value)
    }
  })
  return manuscriptEl
}
