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

import { getTrimmedTextContent } from '../../lib/utils'

const defaultTitle = 'Untitled Manuscript'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export const jatsFrontTransformations = {
  ids: [] as string[],
  createTitle(document: Document, front: Element) {
    let element = document.querySelector(
      'article-meta > title-group > article-title'
    )
    if (!element || !element.textContent) {
      element = document.createElement('article-title')
      element.textContent = defaultTitle
    }
    // element.textContent = element.textContent.trim()
    front.prepend(element)
  },
  createAuthorNotes(document: Document, front: Element) {
    const authornotes = document.querySelector('article-meta > author-notes')
    if (!authornotes) {
      return
    }
    const authorNotesEl = document.createElement('author-notes')
    const title = document.createElement('section_title')
    title.textContent = 'Correspondance'
    authorNotesEl.append(title)
    authornotes
      .querySelectorAll('fn:not([fn-type]), :scope > p, corresp')
      .forEach((node) => {
        switch (node.nodeName) {
          case 'fn': {
            const fnEl = document.createElement('fn-author')
            fnEl.innerHTML = node.innerHTML
            fnEl.setAttribute('kind', 'footnote')
            const id = node.getAttribute('id')
            if (id) {
              this.ids.push(id)
              fnEl.setAttribute('id', id)
            }
            authorNotesEl.append(fnEl)
            break
          }
          case 'p': {
            const pEl = document.createElementNS(null, 'p')
            pEl.innerHTML = node.innerHTML
            authorNotesEl.append(pEl)
            break
          }
          case 'corresp': {
            const correspEl = document.createElement('corresp')
            const label = node.querySelector('label')
            if (label) {
              label.remove()
            }
            correspEl.innerHTML = node.innerHTML
            correspEl.setAttribute('label', label?.textContent?.trim() || '')
            const id = node.getAttribute('id')

            if (id) {
              this.ids.push(id)
              correspEl.setAttribute('id', id)
            }
            authorNotesEl.append(correspEl)
            break
          }
        }
      })

    front.append(authorNotesEl)
  },
  createContributors(document: Document, front: Element) {
    const contribs = document.querySelectorAll(
      'article-meta > contrib-group > contrib[contrib-type="author"]'
    )
    const contributors = document.createElement('contributors')
    contribs.forEach((element, priority) => {
      const contributor = document.createElement('contributor')
      const givenEl = getTrimmedTextContent(element, 'name > given-names')
      if (givenEl) {
        contributor.setAttribute('given', givenEl)
      }
      const surname = getTrimmedTextContent(element, 'name > surname')
      if (surname) {
        contributor.setAttribute('family', surname)
      }
      const correspEl = element.getAttribute('corresp') === 'yes'
      if (correspEl) {
        contributor.setAttribute('isCorresponding', correspEl.toString())
      }

      const orcid = getTrimmedTextContent(
        element,
        'contrib-id[contrib-id-type="orcid"]'
      )
      if (orcid) {
        contributor.setAttribute('ORCIDIdentifier', orcid)
      }
      const xrefs = element.querySelectorAll('xref')

      const footnotes = document.createElement('fns')
      const corresps = document.createElement('corresps')
      const affs = document.createElement('affs')
      for (const xref of xrefs) {
        const rid = xref.getAttribute('rid')
        const type = xref.getAttribute('ref-type')
        if (rid && this.ids.includes(rid)) {
          if (type === 'fn') {
            const fn = document.createElement('fn')
            fn.setAttribute('noteID', rid)
            fn.setAttribute('noteLabel', xref.textContent?.trim() || '')
            footnotes.append(fn)
          } else if (type === 'corresp') {
            const corresp = document.createElement('corresp')
            corresp.setAttribute('correspID', rid)
            corresp.setAttribute('correspLabel', xref.textContent?.trim() || '')
            corresps.append(corresp)
          } else if (type === 'aff') {
            const rids = rid.split(/\s+/).filter(Boolean) as string[]
            if (rids.length) {
              rids.forEach((affID) => {
                const aff = document.createElement('aff')
                aff.setAttribute('affiliationID', affID)
                affs.append(aff)
              })
            }
          }
        }
      }
      contributor.append(footnotes, corresps, affs)
      contributor.setAttribute('priority', priority.toString())
      contributor.setAttribute('role', 'author')
      contributors.append(contributor)
    })
    front.insertBefore(contributors, front.querySelector('affiliations'))
  },

  createAffiliations(document: Document, front: Element) {
    const affiliations = document.querySelectorAll(
      'article-meta > contrib-group > aff'
    )
    const affiliationGroup = document.createElement('affiliations')
    affiliations.forEach((element, priority) => {
      const affiliation = document.createElement('affiliation')
      affiliation.setAttribute('priority', priority.toString())
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

      const email = element.querySelector('email')

      if (email) {
        const emailHref = email.getAttributeNS(XLINK_NAMESPACE, 'href')
        const emailText = email.textContent?.trim()
        if (emailHref) {
          affiliation.setAttribute('email-href', emailHref)
        }
        if (emailText) {
          affiliation.setAttribute('email-text', emailText)
        }
      }
      const id = element.getAttribute('id')
      if (id) {
        affiliation.setAttribute('id', id)
        this.ids.push(id)
      }
      affiliationGroup.append(affiliation)
    })
    front.append(affiliationGroup)
  },
}
