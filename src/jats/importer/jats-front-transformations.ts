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

import { getTrimmedTextContent } from '../../lib/utils'
import { generateID } from '../../transformer'
import { htmlFromJatsNode } from './jats-parser-utils'

export const defaultTitle = 'Untitled Manuscript'

export const jatsFrontTransformations = {
  setArticleAttrs(doc: Document, template?: string) {
    const doi = doc.querySelector(
      'article-meta > article-id[pub-id-type="doi"]'
    )?.textContent
    const Attrs = {
      DOI: doi ?? '',
      prototype: template ?? '',
      id: generateID(ObjectTypes.Manuscript),
    }
    Object.entries(Attrs).forEach(([key, value]) => {
      if (value) {
        doc.querySelector('article')?.setAttribute(key, value)
      }
    })
  },
  createTitle(front: Element, createElement: (tagName: string) => HTMLElement) {
    let title = front.querySelector(
      'article-meta > title-group > article-title'
    )
    if (title) {
      title.innerHTML = htmlFromJatsNode(title, createElement) ?? defaultTitle
    } else {
      title = createElement('article-title')
      title.textContent = defaultTitle
    }
    return title
  },
  createAuthorNotes(
    document: Document,
    createElement: (tagName: string) => HTMLElement
  ) {
    const authornotes = document.querySelector('article-meta > author-notes')
    if (!authornotes) {
      return
    }
    const authorNotesEl = createElement('author-notes')
    authornotes
      .querySelectorAll('fn:not([fn-type]), :scope > p, corresp')
      .forEach((node) => {
        switch (node.nodeName) {
          case 'fn': {
            this.appendFootnote(node, authorNotesEl, createElement)
            break
          }
          case 'p': {
            this.appendParagraph(document, node, authorNotesEl)
            break
          }
          case 'corresp': {
            this.appendCorresp(node, authorNotesEl, createElement)
            break
          }
        }
      })

    return authorNotesEl
  },

  appendFootnote(
    node: Element,
    element: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const fnEl = createElement('fn-author')
    fnEl.innerHTML = node.innerHTML
    fnEl.setAttribute('kind', 'footnote')
    const id = node.getAttribute('id')
    if (id) {
      fnEl.setAttribute('id', id)
    }
    element.append(fnEl)
  },
  appendParagraph(document: Document, node: Element, element: Element) {
    const pEl = document.createElementNS(null, 'p')
    pEl.innerHTML = node.innerHTML
    element.append(pEl)
  },
  appendCorresp(
    node: Element,
    element: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const correspEl = createElement('corresp')
    const label = node.querySelector('label')
    if (label) {
      label.remove()
    }
    correspEl.textContent = node.textContent?.trim() || ''
    correspEl.setAttribute('label', label?.textContent?.trim() || '')
    const id = node.getAttribute('id')
    if (id) {
      correspEl.setAttribute('id', id)
    }
    element.append(correspEl)
  },
  createContributors(
    front: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const contribs = front.querySelectorAll(
      'article-meta > contrib-group > contrib[contrib-type="author"]'
    )
    const contributors = createElement('contributors')
    contribs.forEach((element, priority) => {
      const contributor = this.createContributorElement(priority, createElement)
      this.setNameAttrs(element, contributor)
      this.setOrcidAttribute(element, contributor)
      this.setIsCorrespondingAttribute(element, contributor)
      this.setContributorReferences(element, contributor, createElement)
      contributors.append(contributor)
    })
    return contributors
  },
  createContributorElement(
    priority: number,
    createElement: (tagName: string) => HTMLElement
  ) {
    const contributor = createElement('contributor')
    contributor.setAttribute('priority', priority.toString())
    contributor.setAttribute('role', 'author')
    return contributor
  },
  setNameAttrs(node: Element, element: Element) {
    const given = getTrimmedTextContent(node, 'name > given-names')
    if (given) {
      element.setAttribute('given', given)
    }
    const surname = getTrimmedTextContent(node, 'name > surname')
    if (surname) {
      element.setAttribute('family', surname)
    }
  },
  setOrcidAttribute(node: Element, element: Element) {
    const orcid = getTrimmedTextContent(
      node,
      'contrib-id[contrib-id-type="orcid"]'
    )
    if (orcid) {
      element.setAttribute('ORCIDIdentifier', orcid)
    }
  },
  setIsCorrespondingAttribute(node: Element, element: Element) {
    const isCorresponding = node.getAttribute('corresp') === 'yes'
    if (isCorresponding) {
      element.setAttribute('isCorresponding', isCorresponding.toString())
    }
  },
  setContributorReferences(
    node: Element,
    element: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const xrefs = node.querySelectorAll('xref')
    const footnotes = createElement('fns')
    const corresps = createElement('corresps')
    const affs = createElement('affs')
    for (const xref of xrefs) {
      const rid = xref.getAttribute('rid')
      const type = xref.getAttribute('ref-type')
      if (rid) {
        switch (type) {
          case 'fn':
            this.appendFootnoteID(xref, footnotes, rid, createElement)
            break
          case 'corresp':
            this.appendCorrespID(xref, corresps, rid, createElement)
            break
          case 'aff':
            this.appendAffiliationID(affs, rid, createElement)
            break
        }
      }
    }

    element.append(footnotes, corresps, affs)
  },
  appendFootnoteID(
    xref: Element,
    footnotes: Element,
    rid: string,
    createElement: (tagName: string) => HTMLElement
  ) {
    const fn = createElement('fn')
    fn.setAttribute('noteID', rid)
    fn.setAttribute('noteLabel', xref.textContent?.trim() || '')
    footnotes.append(fn)
  },
  appendCorrespID(
    xref: Element,
    corresps: Element,
    rid: string,
    createElement: (tagName: string) => HTMLElement
  ) {
    const corresp = createElement('corresp')
    corresp.setAttribute('correspID', rid)
    corresp.setAttribute('correspLabel', xref.textContent?.trim() || '')
    corresps.append(corresp)
  },
  appendAffiliationID(
    affs: Element,
    rid: string,
    createElement: (tagName: string) => HTMLElement
  ) {
    const rids = rid.split(/\s+/).filter(Boolean) as string[]
    if (rids.length) {
      rids.forEach((affID) => {
        const aff = createElement('aff')
        aff.setAttribute('affiliationID', affID)
        affs.append(aff)
      })
    }
  },
  createAffiliations(
    front: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const affiliations = front.querySelectorAll(
      'article-meta > contrib-group > aff'
    )
    const affiliationGroup = createElement('affiliations')
    affiliations.forEach((element, priority) => {
      const affiliation = this.createAffiliationElement(
        element,
        priority,
        createElement
      )
      this.setInstitutionAttrs(element, affiliation)
      this.setAddressAttrs(element, affiliation)
      this.appendEmail(element, affiliation)
      affiliationGroup.append(affiliation)
    })
    return affiliationGroup
  },
  createAffiliationElement(
    element: Element,
    priority: number,
    createElement: (tagName: string) => HTMLElement
  ) {
    const affiliation = createElement('affiliation')
    affiliation.setAttribute('priority', priority.toString())
    const id = element.getAttribute('id')
    if (id) {
      affiliation.setAttribute('id', id)
    }
    return affiliation
  },
  appendEmail(element: Element, affiliation: Element) {
    const emailEl = element.querySelector('email')
    if (emailEl) {
      affiliation.appendChild(emailEl)
    }
  },
  setInstitutionAttrs(element: Element, affiliation: Element) {
    for (const node of element.querySelectorAll('institution')) {
      const content = node.textContent?.trim()
      if (!content) {
        continue
      }
      const type = node.getAttribute('content-type')
      if (type === 'dept') {
        affiliation.setAttribute('department', content)
      } else {
        affiliation.setAttribute('institution', content)
      }
    }
  },
  setAddressAttrs(element: Element, affiliation: Element) {
    const addressLine1 = getTrimmedTextContent(
      element,
      'addr-line:nth-of-type(1)'
    )
    const addressLine2 = getTrimmedTextContent(
      element,
      'addr-line:nth-of-type(2)'
    )
    const addressLine3 = getTrimmedTextContent(
      element,
      'addr-line:nth-of-type(3)'
    )
    const postCode = getTrimmedTextContent(element, 'postal-code')
    const country = getTrimmedTextContent(element, 'country')

    if (addressLine1) {
      affiliation.setAttribute('addressLine1', addressLine1)
    }
    if (addressLine2) {
      affiliation.setAttribute('addressLine2', addressLine2)
    }
    if (addressLine3) {
      affiliation.setAttribute('addressLine3', addressLine3)
    }
    if (postCode) {
      affiliation.setAttribute('postCode', postCode)
    }
    if (country) {
      affiliation.setAttribute('country', country)
    }
  },
}
