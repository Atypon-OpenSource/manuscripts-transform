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

import { BibliographyItem } from '@manuscripts/json-schema'

import {
  chooseSectionCategoryByType,
  chooseSecType,
  getCoreSectionTitles,
} from '../../transformer'

const removeNodeFromParent = (node: Element) =>
  node.parentNode && node.parentNode.removeChild(node)

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

const createSectionContainer = (
  type: string,
  createElement: (tagName: string) => HTMLElement
) => {
  const sectionContainer = createElement('sec')
  const sectionCategory = chooseSectionCategoryByType(type)
  sectionContainer.setAttribute(
    'sec-type',
    sectionCategory ? chooseSecType(sectionCategory) : ''
  )

  const title = createElement('title')
  title.textContent = sectionCategory
    ? getCoreSectionTitles(sectionCategory)[0]
    : ' '
  sectionContainer.appendChild(title)
  return sectionContainer
}

export const jatsBodyTransformations = {
  ensureSection(
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    // Create and add a section if there is no section the content can be appended into
    let section = createElement('sec') as Element

    const title = section.querySelector('title')
    if (!title) {
      const title = createElement('title')
      title.textContent = ''
      section.appendChild(title)
    }

    const { firstElementChild } = body
    if (firstElementChild && firstElementChild.tagName === 'sec') {
      section = firstElementChild
    } else {
      body.insertBefore(section, body.firstChild)
    }

    // Move any element without a section to the previous section
    body.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element
        if (element.tagName !== 'sec') {
          section.appendChild(element)
        } else {
          section = element
        }
      }
    })
  },
  createAbstract(
    abstractNode: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const abstractType = abstractNode.getAttribute('abstract-type')

    const section = createElement('sec')
    const sectionType = abstractType ? `abstract-${abstractType}` : 'abstract'
    section.setAttribute('sec-type', sectionType)

    if (!abstractNode.querySelector('abstract > title')) {
      const title = createElement('title')
      title.textContent = abstractType
        ? `${capitalizeFirstLetter(abstractType)} Abstract`
        : 'Abstract'
      section.appendChild(title)
    }

    while (abstractNode.firstChild) {
      section.appendChild(abstractNode.firstChild)
    }
    return section
  },
  createAcknowledgments(
    ackNode: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'acknowledgments')

    const titleNode = ackNode.querySelector('title')

    if (titleNode) {
      section.appendChild(titleNode)
    } else {
      const title = createElement('title')
      title.textContent = 'Acknowledgements'
      section.appendChild(title)
    }

    while (ackNode.firstChild) {
      section.appendChild(ackNode.firstChild)
    }
    return section
  },
  createBibliography(
    doc: Document,
    references: BibliographyItem[],
    createElement: (tagName: string) => HTMLElement
  ) {
    const bibSec = doc.createElement('sec')
    bibSec.setAttribute('sec-type', 'bibliography')

    const titleNode = doc.querySelector('back > ref-list > title')
    if (titleNode) {
      bibSec.appendChild(titleNode)
    } else {
      const title = createElement('title')
      title.textContent = 'References'
      bibSec.appendChild(title)
    }

    const refList = doc.createElement('ref-list')
    for (const ref of references) {
      const item = doc.createElement('ref')
      item.setAttribute('id', ref._id)
      item.setAttribute('type', ref.type)
      item.setAttribute('author', JSON.stringify(ref.author))
      item.setAttribute('issued', JSON.stringify(ref.issued))
      ref['container-title'] &&
        item.setAttribute('container-title', ref['container-title'])
      ref.DOI && item.setAttribute('doi', ref.DOI)
      ref.volume && item.setAttribute('volume', ref.volume.toString())
      ref.issue && item.setAttribute('issue', ref.issue.toString())
      ref.supplement && item.setAttribute('supplement', ref.supplement)
      ref.page && item.setAttribute('page', ref.page.toString())
      ref.title && item.setAttribute('title', ref.title)
      ref.literal && item.setAttribute('literal', ref.literal)
      refList.appendChild(item)
    }

    bibSec.appendChild(refList)
    return bibSec
  },
  createFootnotes(
    footnoteGroups: Element[],
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'endnotes')

    const titleNode = footnoteGroups
      .map((g) => g.querySelector('title'))
      .filter((t) => t !== null)[0]

    if (titleNode) {
      section.appendChild(titleNode)
    } else {
      const title = createElement('title')
      title.textContent = 'Footnotes'
      section.appendChild(title)
    }

    for (const footnoteGroup of footnoteGroups) {
      section.appendChild(footnoteGroup)
    }

    return section
  },
  createAppendixSection(
    app: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'appendices')
    section.append(...app.children)
    return section
  },
  createFloatsGroupSection(
    floatsGroup: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'floating-element')

    const title = createElement('title')
    title.textContent = 'Floating Group'
    section.appendChild(title)

    section.append(...floatsGroup.children)
    return section
  },
  moveAbstractsIntoContainer(
    doc: Document,
    abstractsContainer: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const abstractNodes = doc.querySelectorAll(
      'front > article-meta > abstract'
    )
    abstractNodes.forEach((abstractNode) => {
      const abstract = this.createAbstract(abstractNode, createElement)
      removeNodeFromParent(abstractNode)
      abstractsContainer.appendChild(abstract)
    })
  },
  wrapBodySections(doc: Document, bodyContainer: Element) {
    const bodySections = doc.querySelectorAll(
      'body > sec:not([sec-type="backmatter"]), body > sec:not([sec-type])'
    )
    bodySections.forEach((section) => {
      removeNodeFromParent(section)
      bodyContainer.appendChild(section)
    })
  },
  moveBackSectionsIntoContainer(doc: Document, backmatterContainer: Element) {
    for (const section of doc.querySelectorAll('back > sec')) {
      removeNodeFromParent(section)
      backmatterContainer.appendChild(section)
    }
  },
  moveAcknowledgmentsIntoContainer(
    doc: Document,
    backmatterContainer: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const ackNode = doc.querySelector('back > ack')
    if (ackNode) {
      const acknowledgements = this.createAcknowledgments(
        ackNode,
        createElement
      )
      removeNodeFromParent(ackNode)
      backmatterContainer.appendChild(acknowledgements)
    }
  },
  moveAppendicesIntoContainer(
    doc: Document,
    backmatterContainer: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const appGroup = doc.querySelectorAll('back > app-group > app')
    for (const app of appGroup) {
      const appendix = this.createAppendixSection(app, createElement)
      removeNodeFromParent(app)
      backmatterContainer.appendChild(appendix)
    }
  },
  moveBibliographyIntoContainer(
    doc: Document,
    backmatterContainer: Element,
    references: BibliographyItem[] | null,
    createElement: (tagName: string) => HTMLElement
  ) {
    if (references) {
      backmatterContainer.appendChild(
        this.createBibliography(doc, references, createElement)
      )
    }
  },
  moveSectionsToBody(
    doc: Document,
    body: Element,
    references: BibliographyItem[] | null,
    createElement: (tagName: string) => HTMLElement
  ) {
    const bodyContainer = createSectionContainer('body', createElement)
    const abstractsContainer = createSectionContainer(
      'abstracts',
      createElement
    )
    const backmatterContainer = createSectionContainer(
      'backmatter',
      createElement
    )
    this.mapFootnotesToSections(doc, backmatterContainer, createElement)
    this.wrapBodySections(doc, bodyContainer)
    this.moveAbstractsIntoContainer(doc, abstractsContainer, createElement)
    this.moveBackSectionsIntoContainer(doc, backmatterContainer)
    this.moveAcknowledgmentsIntoContainer(
      doc,
      backmatterContainer,
      createElement
    )
    this.moveAppendicesIntoContainer(doc, backmatterContainer, createElement)
    this.moveBibliographyIntoContainer(
      doc,
      backmatterContainer,
      references,
      createElement
    )
    body.insertBefore(abstractsContainer, body.firstChild)
    body.insertBefore(bodyContainer, abstractsContainer.nextSibling)
    body.append(backmatterContainer)
  },
  mapFootnotesToSections(
    doc: Document,
    backmatterContainer: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const footnoteGroups = [...doc.querySelectorAll('fn[fn-type]')]
    for (const footnote of footnoteGroups) {
      const type = footnote.getAttribute('fn-type') || '' //Cannot be null since it is queried above
      const category = chooseSectionCategoryByType(type)
      if (category) {
        const section = createElement('sec')
        const title = footnote.querySelector('p[content-type="fn-title"]')
        if (title) {
          const sectionTitleElement = createElement('title')
          const titleTextContent = title.textContent?.trim()
          if (titleTextContent) {
            sectionTitleElement.textContent = titleTextContent
          }
          removeNodeFromParent(title)
          section.append(sectionTitleElement)
        }
        section.append(...footnote.children)
        removeNodeFromParent(footnote)

        section.setAttribute('sec-type', chooseSecType(category))
        backmatterContainer.append(section)
      }
    }

    const footnotes = [...doc.querySelectorAll('fn')]
    const footnotesSection = doc.querySelector('sec[sec-type="endnotes"]')
    const footnotesSectionGroup = footnotesSection?.querySelector('fn-group')
    const containingGroup = footnotesSectionGroup || createElement('fn-group')

    for (const footnote of footnotes) {
      const type = footnote.getAttribute('fn-type')
      if (!type) {
        containingGroup.appendChild(footnote)
      }
    }

    if (!footnotesSection && containingGroup.innerHTML) {
      const section = this.createFootnotes([containingGroup], createElement)
      backmatterContainer.append(section)
    }

    // move footnotes without fn-type from back to body section
    let regularFootnoteGroups = [
      ...doc.querySelectorAll('back > fn-group:not([fn-type])'),
    ]
    // check if these groups don't have an fn-type because they are actually a mixed group and not a normal footnote group
    regularFootnoteGroups = regularFootnoteGroups.filter((group) => {
      // count check for if all the irrelevant fns as already been extracted
      return group.childElementCount === 0
        ? false
        : !group.querySelector('fn[fn-type]')
    })

    if (regularFootnoteGroups.length > 0) {
      regularFootnoteGroups.map((g) => removeNodeFromParent(g))
      const footnotes = this.createFootnotes(
        regularFootnoteGroups,
        createElement
      )
      backmatterContainer.appendChild(footnotes)
    }
  },
  // move captions to the end of their containers
  moveCaptionsToEnd(body: Element) {
    const captions = body.querySelectorAll('caption')

    for (const caption of captions) {
      if (caption.parentNode) {
        caption.parentNode.appendChild(caption)
      }
    }
  },
  moveTableFooterToEnd(body: Element) {
    const tableFooters = body.querySelectorAll('table-wrap-foot')

    for (const tableFooter of tableFooters) {
      if (tableFooter.parentNode) {
        tableFooter.parentNode.appendChild(tableFooter)
      }
    }
  },
  moveFloatsGroupToBody(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const floatsGroup = doc.querySelector('floats-group')
    if (floatsGroup) {
      const floatsGroupSection = this.createFloatsGroupSection(
        floatsGroup,
        createElement
      )
      removeNodeFromParent(floatsGroup)
      body.appendChild(floatsGroupSection)
    }
  },
  moveBlockNodesFromParagraph(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    // TODO:: add other block node to the array
    const blockNodes = ['disp-formula']
    const paragraphs = [...body.querySelectorAll('sec > p')].filter((node) =>
      blockNodes.find((node_name) =>
        node.querySelector(`:scope > ${node_name}`)
      )
    )

    paragraphs.map((paragraph) => {
      let newParagraph = createElement('p')
      const parent = doc.createDocumentFragment()

      while (paragraph?.firstChild) {
        if (blockNodes.includes(paragraph?.firstChild.nodeName)) {
          if (newParagraph.innerHTML.trim().length > 0) {
            parent.append(newParagraph)
            newParagraph = createElement('p')
          }
          parent.append(paragraph?.firstChild)
        } else {
          newParagraph.append(paragraph?.firstChild)
        }
      }

      paragraph?.replaceWith(parent)
    })
  },
  moveKeywordsToBody(
    document: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const keywordGroups = [...document.querySelectorAll('kwd-group')]
    if (keywordGroups.length > 0) {
      const section = createElement('sec')
      section.setAttribute('sec-type', 'keywords')
      const title = createElement('title')
      title.textContent = 'Keywords'
      section.append(title)
      const kwdGroupsEl = createElement('kwd-group-list')
      // Using the first kwd-group since for the moment we only support single kwd-group
      kwdGroupsEl.append(keywordGroups[0])
      section.append(kwdGroupsEl)
      body.prepend(section)
    }
  },
}
