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

import { ObjectTypes } from '@manuscripts/json-schema'

import { defaultTitle } from '../../lib/deafults'
import { generateID } from '../../transformer'
import { htmlFromJatsNode } from './jats-parser-utils'

export const jatsFrontTransformations = {
  setArticleAttrs(doc: Document, template?: string) {
    const doi = doc.querySelector(
      'article-meta > article-id[pub-id-type="doi"]'
    )?.textContent

    const attrs = {
      DOI: doi ?? '',
      prototype: template ?? '',
      id: generateID(ObjectTypes.Manuscript),
    }

    const article = doc.querySelector('article')
    if (article) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value) {
          article.setAttribute(key, value)
        }
      })
    }
  },
  createTitle(front: Element, createElement: (tagName: string) => HTMLElement) {
    let title = front.querySelector(
      'article-meta > title-group > article-title'
    )
    if (title) {
      title.innerHTML = htmlFromJatsNode(title, createElement) ?? defaultTitle
    } else {
      title = createElement('article-title')
      title.innerHTML = defaultTitle
    }
    return title
  },
  createAuthorNotes(
    document: Document,
    createElement: (tagName: string) => HTMLElement
  ) {
    const authorNotes = document.querySelector('article-meta > author-notes')
    if (authorNotes) {
      const sectionTitle = createElement('title')
      authorNotes.prepend(sectionTitle)
    }
    return authorNotes
  },
  createContributors(
    front: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const contributors = createElement('contributors')

    const contributorsElement = front.querySelectorAll(
      'article-meta > contrib-group > contrib[contrib-type="author"]'
    )
    contributorsElement.forEach((el, priority) => {
      el.setAttribute('priority', priority.toString())
      contributors.appendChild(el)
    })
    return contributors.childNodes.length > 0 ? contributors : null
  },
  createAffiliations(
    front: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const affiliations = createElement('affiliations')

    const affiliationsElements = front.querySelectorAll(
      'article-meta > contrib-group > aff'
    )
    affiliationsElements.forEach((el, priority) => {
      el.setAttribute('priority', priority.toString())
      affiliations.appendChild(el)
    })

    return affiliations.childNodes.length > 0 ? affiliations : null
  },
}
