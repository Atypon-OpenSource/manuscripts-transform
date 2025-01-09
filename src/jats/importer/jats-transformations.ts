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

import { defaultTitle } from '../../lib/deafults'
import { SectionCategory, SectionGroup } from '../../schema'
import { htmlFromJatsNode } from './jats-parser-utils'

export type CreateElement = (tagName: string) => HTMLElement

const removeNodeFromParent = (node: Element) =>
  node.parentNode && node.parentNode.removeChild(node)

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

const createSectionGroup = (
  type: SectionGroup,
  createElement: CreateElement
) => {
  const sec = createElement('sec')
  sec.setAttribute('sec-type', type)
  return sec
}

export const addMissingCaptions = (
  doc: Document,
  createElement: CreateElement
) => {
  const elements = doc.querySelectorAll('fig, table-wrap, media')
  for (const element of elements) {
    let caption: Element | null = element.querySelector('caption')
    if (!caption) {
      caption = createElement('caption')
      element.nodeName === 'fig'
        ? element.appendChild(caption)
        : element.prepend(caption)
    }
    if (!caption.querySelector('title')) {
      caption.prepend(createElement('title'))
    }
    if (!caption.querySelector('p')) {
      caption.appendChild(createElement('p'))
    }
  }
}

export const moveTitle = (front: Element, createElement: CreateElement) => {
  let title = front.querySelector('article-meta > title-group > article-title')
  if (title) {
    title.innerHTML = htmlFromJatsNode(title, createElement) ?? defaultTitle
  } else {
    title = createElement('article-title')
    title.innerHTML = defaultTitle
  }
  front.parentNode?.insertBefore(title, front)
}

export const moveAuthorNotes = (
  front: Element,
  createElement: CreateElement
) => {
  const authorNotes = front.querySelector('article-meta > author-notes')
  if (authorNotes) {
    const sectionTitle = createElement('title')
    authorNotes.prepend(sectionTitle)
    front.parentNode?.insertBefore(authorNotes, front)
  }
}
export const moveAwards = (front: Element) => {
  const awards = front.querySelector('article-meta > funding-group')
  if (awards) {
    front.parentNode?.insertBefore(awards, front)
  }
}

export const moveContributors = (
  front: Element,
  createElement: CreateElement
) => {
  const contribs = front.querySelectorAll(
    'contrib-group > contrib[contrib-type="author"]'
  )

  if (contribs.length) {
    const contributors = createElement('contributors')
    contribs.forEach((c) => contributors.appendChild(c))
    front.parentNode?.insertBefore(contributors, front)
  }
}

export const moveAffiliations = (
  front: Element,
  createElement: CreateElement
) => {
  const affs = front.querySelectorAll('article-meta > contrib-group > aff')
  if (affs.length) {
    const affiliations = createElement('affiliations')
    affs.forEach((a) => affiliations.appendChild(a))
    front.parentNode?.insertBefore(affiliations, front)
  }
}

export const moveAbstracts = (
  doc: Document,
  group: Element,
  createElement: CreateElement
) => {
  const abstracts = doc.querySelectorAll('front > article-meta > abstract')
  abstracts.forEach((abstract) => {
    const sec = createAbstractSection(abstract, createElement)
    removeNodeFromParent(abstract)
    group.appendChild(sec)
  })
}

export const createBoxedElementSection = (
  body: Element,
  createElement: (tagName: string) => HTMLElement
) => {
  const boxedTexts = body.querySelectorAll('boxed-text')
  for (const boxedText of boxedTexts) {
    const boxElementId = boxedText.getAttribute('id')
    const boxElementSec = createElement('sec')
    boxElementSec.setAttribute('sec-type', 'box-element')
    if (boxElementId) {
      boxElementSec.setAttribute('id', boxElementId)
    }
    const title = createElement('title')
    title.textContent = 'BoxElement'
    boxElementSec.append(title)
    for (const element of [...boxedText.children]) {
      if (element?.tagName === 'label' || element?.tagName === 'caption') {
        boxElementSec.append(element)
      }
    }
    const containerSection = createElement('sec')
    containerSection.append(...boxedText.children)
    boxElementSec.append(containerSection)
    boxedText.replaceWith(boxElementSec)
  }
}

export const createBody = (
  doc: Document,
  body: Element,
  createElement: CreateElement
) => {
  const group = createSectionGroup('body', createElement)
  const elements = body.querySelectorAll(
    ':scope > *:not(sec), :scope > sec:not([sec-type="backmatter"]), :scope > sec:not([sec-type])'
  )
  elements.forEach((element) => {
    removeNodeFromParent(element)
    group.appendChild(element)
  })
  moveFloatsGroupToBody(doc, group, createElement)
  body.append(group)
}

export const createAbstracts = (
  doc: Document,
  body: Element,
  createElement: CreateElement
) => {
  const group = createSectionGroup('abstracts', createElement)
  moveAbstracts(doc, group, createElement)
  body.insertBefore(group, body.lastElementChild)
}

export const createBackmatter = (
  doc: Document,
  body: Element,
  sectionCategories: SectionCategory[],
  createElement: CreateElement
) => {
  const group = createSectionGroup('backmatter', createElement)
  moveBackSections(doc, group)
  moveAppendices(doc, group, createElement)
  moveSpecialFootnotes(doc, group, sectionCategories, createElement)
  moveFootnotes(doc, group, createElement)
  moveAcknowledgments(doc, group, createElement)
  body.append(group)
}

const moveFootnotes = (
  doc: Document,
  group: Element,
  createElement: CreateElement
) => {
  const fns = [
    ...doc.querySelectorAll('fn:not(table-wrap-foot fn, author-notes fn)'),
  ]
  let section = doc.querySelector('sec[sec-type="endnotes"]')
  const fnGroup =
    section?.querySelector('fn-group') || createElement('fn-group')
  fns.forEach((fn) => {
    if (!fn.getAttribute('fn-type')) {
      fnGroup.appendChild(fn)
    }
  })
  if (!section && fnGroup.innerHTML) {
    section = createFootnotesSection([fnGroup], createElement)
  }
  if (section) {
    group.insertBefore(
      section,
      group.firstChild?.nextSibling || group.firstChild
    )
  }
}

// process footnotes with special meaning to
const moveSpecialFootnotes = (
  doc: Document,
  group: Element,
  sectionCategories: SectionCategory[],
  createElement: CreateElement
) => {
  const fns = [...doc.querySelectorAll('fn[fn-type]')]
  for (const fn of fns) {
    const type = fn.getAttribute('fn-type') || '' //Cannot be null since it is queried above
    const category = sectionCategories.find((category) =>
      category.synonyms.includes(type)
    )
    if (category) {
      const section = createElement('sec')
      const fnTitle = fn.querySelector('p[content-type="fn-title"]')
      if (fnTitle) {
        const title = createElement('title')
        const titleText = fnTitle.textContent?.trim()
        if (titleText) {
          title.textContent = titleText
        }
        removeNodeFromParent(fnTitle)
        section.append(title)
      }
      section.append(...fn.children)
      removeNodeFromParent(fn)
      section.setAttribute('sec-type', category.id)
      group.append(section)
    }
  }
}
// move captions to the end of their containers
export const moveCaptionsToEnd = (body: Element) => {
  const captions = body.querySelectorAll('caption')

  for (const caption of captions) {
    if (
      caption.parentNode &&
      caption.parentNode.nodeName !== 'table-wrap' &&
      caption.parentNode.nodeName !== 'boxed-text'
    ) {
      caption.parentNode.appendChild(caption)
    }
  }
}

const createAbstractSection = (
  abstract: Element,
  createElement: CreateElement
) => {
  const abstractType = abstract.getAttribute('abstract-type')

  const section = createElement('sec')
  const sectionType = abstractType ? `abstract-${abstractType}` : 'abstract'
  section.setAttribute('sec-type', sectionType)

  if (!abstract.querySelector(':scope > title')) {
    const title = createElement('title')
    title.textContent = abstractType
      ? `${capitalizeFirstLetter(abstractType)} Abstract`
      : 'Abstract'
    section.appendChild(title)
  }

  while (abstract.firstChild) {
    section.appendChild(abstract.firstChild)
  }
  return section
}

const createAcknowledgmentsSection = (
  ack: Element,
  createElement: CreateElement
) => {
  const section = createElement('sec')
  section.setAttribute('sec-type', 'acknowledgments')

  if (!ack.querySelector('title')) {
    const title = createElement('title')
    title.textContent = 'Acknowledgements'
    section.appendChild(title)
  }

  while (ack.firstChild) {
    section.appendChild(ack.firstChild)
  }
  return section
}

const createFootnotesSection = (
  fnGroups: Element[],
  createElement: CreateElement
) => {
  const section = createElement('sec')
  section.setAttribute('sec-type', 'endnotes')

  const titleNode = fnGroups
    .map((g) => g.querySelector('title'))
    .filter((t) => t !== null)[0]

  if (titleNode) {
    section.appendChild(titleNode)
  } else {
    const title = createElement('title')
    title.textContent = 'Footnotes'
    section.appendChild(title)
  }

  for (const fnGroup of fnGroups) {
    section.appendChild(fnGroup)
  }

  return section
}

const createAppendicesSection = (
  app: Element,
  createElement: CreateElement
) => {
  const section = createElement('sec')
  section.setAttribute('sec-type', 'appendices')
  section.append(...app.children)
  return section
}

const createFloatsGroupSection = (
  floatsGroup: Element,
  createElement: CreateElement
) => {
  const section = createElement('sec')
  section.setAttribute('sec-type', 'floating-element')

  const title = createElement('title')
  title.textContent = 'Floating Group'
  section.appendChild(title)

  section.append(...floatsGroup.children)
  return section
}

const moveBackSections = (doc: Document, group: Element) => {
  for (const section of doc.querySelectorAll('back > sec')) {
    removeNodeFromParent(section)
    group.appendChild(section)
  }
}

const moveAcknowledgments = (
  doc: Document,
  group: Element,
  createElement: CreateElement
) => {
  const ack = doc.querySelector('back > ack')
  if (ack) {
    const section = createAcknowledgmentsSection(ack, createElement)
    removeNodeFromParent(ack)
    group.appendChild(section)
  }
}
const moveAppendices = (
  doc: Document,
  group: Element,
  createElement: CreateElement
) => {
  const apps = doc.querySelectorAll('back > app-group > app')
  for (const app of apps) {
    const section = createAppendicesSection(app, createElement)
    removeNodeFromParent(app)
    group.appendChild(section)
  }
}

const moveFloatsGroupToBody = (
  doc: Document,
  body: Element,
  createElement: CreateElement
) => {
  const floatsGroup = doc.querySelector('floats-group')
  if (floatsGroup) {
    const sec = createFloatsGroupSection(floatsGroup, createElement)
    removeNodeFromParent(floatsGroup)
    body.appendChild(sec)
  }
}

export const createKeywordsSection = (
  document: Document,
  body: Element,
  createElement: CreateElement
) => {
  const kwdGroups = [...document.querySelectorAll('kwd-group')]
  if (kwdGroups.length > 0) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'keywords')
    const title = createElement('title')
    title.textContent = 'Keywords'
    section.append(title)
    const kwdGroupList = createElement('kwd-group-list')
    // Using the first kwd-group since for the moment we only support single kwd-group
    kwdGroupList.append(kwdGroups[0])
    section.append(kwdGroupList)
    body.prepend(section)
  }
}

export const createSupplementaryMaterialsSection = (
  document: Document,
  body: Element,
  createElement: CreateElement
) => {
  const suppls = [
    ...document.querySelectorAll('article-meta > supplementary-material'),
  ]
  if (suppls.length) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'supplementary-material')
    const title = createElement('title')
    title.textContent = 'Supplementary Material'
    section.append(title)
    section.append(...suppls)
    body.prepend(section)
  }
}

export const moveReferencesToBackmatter = (
  body: Element,
  back: Element,
  createElement: CreateElement
) => {
  const backmatter = body.querySelector('sec[sec-type="backmatter"]')
  const refList = back.querySelector('ref-list')
  if (!backmatter || !refList) {
    return
  }

  removeNodeFromParent(refList)

  const section = createElement('sec')
  section.setAttribute('sec-type', 'bibliography')
  const title = createElement('title')
  title.textContent = 'References'
  section.appendChild(title)
  section.appendChild(refList)

  backmatter.appendChild(section)
}

export const orderTableFootnote = (doc: Document, body: Element) => {
  const rids = new Set(
    [...body.querySelectorAll('tbody > xref[ref-type="fn"]')].map((xref) =>
      xref.getAttribute('rid')
    )
  )

  const fnGroups = doc.querySelectorAll('table-wrap-foot > fn-group')
  fnGroups.forEach((fnGroup) => {
    // sort the un-cited table footnote at the end of list
    const fns = [...fnGroup.querySelectorAll('fn')].sort((fn) =>
      rids.has(fn.getAttribute('id')) ? -1 : 0
    )
    fnGroup.replaceChildren(...fns)
  })
}

export const fixTables = (
  doc: Document,
  body: Element,
  createElement: CreateElement
) => {
  const tableWraps = body.querySelectorAll('table-wrap')
  tableWraps.forEach((tableWrap) => {
    // Move cols into a colgroup if they are not already
    // This more closely maps how they exist in HTML and, subsequently, in ManuscriptJSON
    const table = tableWrap.querySelector('table')
    if (!table) {
      return
    }
    const colgroup = table.querySelector('colgroup')
    const cols = table.querySelectorAll('col')
    if (!colgroup && table.firstChild && cols.length > 0) {
      const colgroup = createElement('colgroup')
      for (const col of cols) {
        colgroup.appendChild(col)
      }
      tableWrap.insertBefore(colgroup, table.nextSibling)
    }
    const tableFootWrap = tableWrap.querySelector('table-wrap-foot')
    if (tableFootWrap) {
      const paragraphs = tableFootWrap.querySelectorAll(':scope > p')
      if (paragraphs.length) {
        const generalTableFootnote = createElement('general-table-footnote')
        for (const paragraph of paragraphs) {
          removeNodeFromParent(paragraph)
          generalTableFootnote.append(paragraph)
        }
        tableFootWrap.prepend(generalTableFootnote)
      }
    }
  })
}
