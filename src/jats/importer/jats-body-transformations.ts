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

import {
  abstractsType,
  backmatterType,
  bodyType,
  SectionGroupType,
} from '../../lib/section-group-type'
import { chooseSectionCategoryByType, chooseSecType } from '../../transformer'

const removeNodeFromParent = (node: Element) =>
  node.parentNode && node.parentNode.removeChild(node)

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

const createSectionGroup = (
  type: SectionGroupType,
  createElement: (tagName: string) => HTMLElement
) => {
  const sec = createElement('sec')
  sec.setAttribute('sec-type', type._id)

  const title = createElement('title')
  title.textContent = type.title
  sec.appendChild(title)
  return sec
}

export const jatsBodyTransformations = {
  ensureSection(
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    // Create and add a section if there is no section the content can be appended into
    let section: Element

    const element = body.firstElementChild
    if (element && element.tagName === 'sec') {
      section = element
    } else {
      section = createElement('sec') as Element
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
  createAbstractSection(
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
  createAcknowledgmentsSection(
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
  createFootnotesSection(
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
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'floating-element')

    const title = createElement('title')
    title.textContent = 'Floating Group'
    section.appendChild(title)

    section.append(...group.children)
    return section
  },
  moveAbstracts(
    doc: Document,
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const abstracts = doc.querySelectorAll('front > article-meta > abstract')
    abstracts.forEach((abstract) => {
      const sec = this.createAbstractSection(abstract, createElement)
      removeNodeFromParent(abstract)
      group.appendChild(sec)
    })
  },
  wrapBodySections(doc: Document, group: Element) {
    const bodySections = doc.querySelectorAll(
      'body > sec:not([sec-type="backmatter"]), body > sec:not([sec-type])'
    )
    bodySections.forEach((section) => {
      removeNodeFromParent(section)
      group.appendChild(section)
    })
  },
  moveBackSections(doc: Document, group: Element) {
    for (const section of doc.querySelectorAll('back > sec')) {
      removeNodeFromParent(section)
      group.appendChild(section)
    }
  },
  moveAcknowledgments(
    doc: Document,
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const ack = doc.querySelector('back > ack')
    if (ack) {
      const sec = this.createAcknowledgmentsSection(ack, createElement)
      removeNodeFromParent(ack)
      group.appendChild(sec)
    }
  },
  moveAppendices(
    doc: Document,
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const apps = doc.querySelectorAll('back > app-group > app')
    for (const app of apps) {
      const sec = this.createAppendixSection(app, createElement)
      removeNodeFromParent(app)
      group.appendChild(sec)
    }
  },
  createBody(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const group = createSectionGroup(bodyType, createElement)
    this.wrapBodySections(doc, group)
    this.moveFloatsGroupToBody(doc, group, createElement)
    body.append(group)
  },
  createAbstracts(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const group = createSectionGroup(abstractsType, createElement)
    this.moveAbstracts(doc, group, createElement)
    body.insertBefore(group, body.lastElementChild)
  },
  createBackmatter(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const group = createSectionGroup(backmatterType, createElement)
    this.moveBackSections(doc, group)
    this.moveAppendices(doc, group, createElement)
    this.moveSpecialFootnotes(doc, group, createElement)
    this.moveFootnotes(doc, group, createElement)
    this.moveAcknowledgments(doc, group, createElement)
    body.append(group)
  },
  // process footnotes with special meaning to
  moveSpecialFootnotes(
    doc: Document,
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const fns = [...doc.querySelectorAll('fn[fn-type]')]
    for (const fn of fns) {
      const type = fn.getAttribute('fn-type') || '' //Cannot be null since it is queried above
      const category = chooseSectionCategoryByType(type)
      if (category) {
        const section = createElement('sec')
        const title = fn.querySelector('p[content-type="fn-title"]')
        if (title) {
          const sectionTitleElement = createElement('title')
          const titleTextContent = title.textContent?.trim()
          if (titleTextContent) {
            sectionTitleElement.textContent = titleTextContent
          }
          removeNodeFromParent(title)
          section.append(sectionTitleElement)
        }
        section.append(...fn.children)
        removeNodeFromParent(fn)

        section.setAttribute('sec-type', chooseSecType(category))
        group.append(section)
      }
    }
  },
  moveFootnotes(
    doc: Document,
    group: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const footnotes = [...doc.querySelectorAll('fn:not(table-wrap-foot fn)')]
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
      const section = this.createFootnotesSection(
        [containingGroup],
        createElement
      )
      group.append(section)
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
      const footnotes = this.createFootnotesSection(
        regularFootnoteGroups,
        createElement
      )
      group.appendChild(footnotes)
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
  fixTables(body: Element, createElement: (tagName: string) => HTMLElement) {
    const tables = body.querySelectorAll('table-wrap > table')
    tables.forEach((table) => {
      // Move cols into a colgroup if they are not already
      // This more closely maps how they exist in HTML and, subsequently, in ManuscriptJSON
      const colgroup = table.querySelector('colgroup')
      const cols = table.querySelectorAll('col')
      if (!colgroup && table.firstChild && cols.length > 0) {
        const colgroup = createElement('colgroup')
        for (const col of cols) {
          colgroup.appendChild(col)
        }
        table.insertBefore(colgroup, table.firstChild)
      }
    })
  },
  moveFloatsGroupToBody(
    doc: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const group = doc.querySelector('floats-group')
    if (group) {
      const sec = this.createFloatsGroupSection(group, createElement)
      removeNodeFromParent(group)
      body.appendChild(sec)
    }
  },
  createKeywords(
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
      const keywordsElement = createElement('kwd-group-list')
      // Using the first kwd-group since for the moment we only support single kwd-group
      keywordsElement.append(keywordGroups[0])
      section.append(keywordsElement)
      body.prepend(section)
    }
  },
  createSuppleMaterials(
    document: Document,
    body: Element,
    createElement: (tagName: string) => HTMLElement
  ) {
    const suppleMaterials = [
      ...document.querySelectorAll('article-meta > supplementary-material'),
    ]
    if (suppleMaterials.length > 0) {
      const section = createElement('sec')
      section.setAttribute('sec-type', 'supplementary-material')
      const title = createElement('title')
      title.textContent = 'supplementary-material'
      section.append(title)
      // Using the first kwd-group since for the moment we only support single kwd-group
      section.append(...suppleMaterials)
      body.prepend(section)
    }
  },
}
