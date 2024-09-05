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
const ids: string[] = []

export const jatsFrontTransformations = {
  createTitle(document: Document, front: Element) {
    let element = document.querySelector(
      'article-meta > title-group > article-title'
    )
    if (!element || !element.textContent) {
      element = document.createElement('article-title')
      element.textContent = defaultTitle
    }
    front.prepend(element)
  },
  createAuthorNotes(document: Document, front: Element) {
    const authornotes = document.querySelector('article-meta > author-notes')
    if (!authornotes) {
      return
    }
    const authorNotesEl = document.createElement('author-notes')
    authornotes
      .querySelectorAll('fn:not([fn-type]), :scope > p, corresp')
      .forEach((node) => {
        authorNotesTransformations.appendContent(document, node, authorNotesEl)
      })

    front.append(authorNotesEl)
  },
  createContributors(document: Document, front: Element) {
    const contribs = document.querySelectorAll(
      'article-meta > contrib-group > contrib[contrib-type="author"]'
    )
    const contributors = document.createElement('contributors')
    contribs.forEach((element, priority) => {
      const contributor = contributorsTransformations.createContributorElement(
        document,
        priority
      )
      contributorsTransformations.setNameAttributes(element, contributor)
      contributorsTransformations.setOrcidAttributes(element, contributor)
      contributorsTransformations.setIsCorrespondingAttribute(
        element,
        contributor
      )
      contributorsTransformations.setXrefs(document, element, contributor)
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
      const affiliation = affiliationsTransformations.createAffiliationElement(
        document,
        element,
        priority
      )
      affiliationsTransformations.setInstitutionAttributes(element, affiliation)
      affiliationsTransformations.setAddressAttributes(element, affiliation)
      affiliationsTransformations.appendEmail(element, affiliation)
      affiliationGroup.append(affiliation)
    })
    front.append(affiliationGroup)
  },
}

const affiliationsTransformations = {
  createAffiliationElement(
    document: Document,
    element: Element,
    priority: number
  ) {
    const affiliation = document.createElement('affiliation')
    affiliation.setAttribute('priority', priority.toString())
    const id = element.getAttribute('id')
    if (id) {
      affiliation.setAttribute('id', id)
      ids.push(id)
    }
    return affiliation
  },
  appendEmail(element: Element, affiliation: Element) {
    const emailEl = element.querySelector('email')
    if (emailEl) {
      affiliation.appendChild(emailEl)
    }
  },
  setInstitutionAttributes(element: Element, affiliation: Element) {
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
  setAddressAttributes(element: Element, affiliation: Element) {
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

const contributorsTransformations = {
  createContributorElement(document: Document, priority: number) {
    const contributor = document.createElement('contributor')
    contributor.setAttribute('priority', priority.toString())
    contributor.setAttribute('role', 'author')

    return contributor
  },
  setNameAttributes(element: Element, contributor: Element) {
    const given = getTrimmedTextContent(element, 'name > given-names')
    if (given) {
      contributor.setAttribute('given', given)
    }
    const surname = getTrimmedTextContent(element, 'name > surname')
    if (surname) {
      contributor.setAttribute('family', surname)
    }
  },
  setOrcidAttributes(element: Element, contributor: Element) {
    const orcid = getTrimmedTextContent(
      element,
      'contrib-id[contrib-id-type="orcid"]'
    )
    if (orcid) {
      contributor.setAttribute('ORCIDIdentifier', orcid)
    }
  },
  setIsCorrespondingAttribute(element: Element, contributor: Element) {
    const isCorresponding = element.getAttribute('corresp') === 'yes'
    if (isCorresponding) {
      contributor.setAttribute('isCorresponding', isCorresponding.toString())
    }
  },
  setXrefs(document: Document, element: Element, contributor: Element) {
    const xrefs = element.querySelectorAll('xref')
    const footnotes = document.createElement('fns')
    const corresps = document.createElement('corresps')
    const affs = document.createElement('affs')
    xrefs.forEach((xref) => {
      const rid = xref.getAttribute('rid')
      const type = xref.getAttribute('ref-type')
      if (rid && ids.includes(rid)) {
        switch (type) {
          case 'fn':
            this.appendFootnoteID(document, xref, footnotes, rid)
            break
          case 'corresp':
            this.appendCorrespID(document, xref, corresps, rid)
            break
          case 'aff':
            this.appendAffiliationID(document, affs, rid)
            break
        }
      }
    })
    contributor.append(footnotes, corresps, affs)
  },
  appendFootnoteID(
    document: Document,
    xref: Element,
    footnotes: Element,
    rid: string
  ) {
    const fn = document.createElement('fn')
    fn.setAttribute('noteID', rid)
    fn.setAttribute('noteLabel', xref.textContent?.trim() || '')
    footnotes.append(fn)
  },
  appendCorrespID(
    document: Document,
    xref: Element,
    corresps: Element,
    rid: string
  ) {
    const corresp = document.createElement('corresp')
    corresp.setAttribute('correspID', rid)
    corresp.setAttribute('correspLabel', xref.textContent?.trim() || '')
    corresps.append(corresp)
  },
  appendAffiliationID(document: Document, affs: Element, rid: string) {
    const rids = rid.split(/\s+/).filter(Boolean) as string[]
    if (rids.length) {
      rids.forEach((affID) => {
        const aff = document.createElement('aff')
        aff.setAttribute('affiliationID', affID)
        affs.append(aff)
      })
    }
  },
}

const authorNotesTransformations = {
  appendContent(document: Document, node: Element, authorNotesEl: Element) {
    switch (node.nodeName) {
      case 'fn': {
        authorNotesTransformations.appendFootnote(document, node, authorNotesEl)
        break
      }
      case 'p': {
        authorNotesTransformations.appendParagraph(
          document,
          node,
          authorNotesEl
        )
        break
      }
      case 'corresp': {
        authorNotesTransformations.appendCorresp(document, node, authorNotesEl)
        break
      }
    }
  },
  appendFootnote(document: Document, node: Element, authorNotesEl: Element) {
    const fnEl = document.createElement('fn-author')
    fnEl.innerHTML = node.innerHTML
    fnEl.setAttribute('kind', 'footnote')
    const id = node.getAttribute('id')
    if (id) {
      ids.push(id)
      fnEl.setAttribute('id', id)
    }
    authorNotesEl.append(fnEl)
  },
  appendParagraph(document: Document, node: Element, authorNotesEl: Element) {
    const pEl = document.createElementNS(null, 'p')
    pEl.innerHTML = node.innerHTML
    authorNotesEl.append(pEl)
  },
  appendCorresp(document: Document, node: Element, authorNotesEl: Element) {
    const correspEl = document.createElement('corresp')
    const label = node.querySelector('label')
    if (label) {
      label.remove()
    }
    correspEl.textContent = node.textContent?.trim() || ''
    correspEl.setAttribute('label', label?.textContent?.trim() || '')
    const id = node.getAttribute('id')

    if (id) {
      ids.push(id)
      correspEl.setAttribute('id', id)
    }
    authorNotesEl.append(correspEl)
  },
}
