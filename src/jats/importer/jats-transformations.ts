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

export type CreateElement = (tagName: string) => HTMLElement

const removeNodeFromParent = (node: Element) =>
  node.parentNode && node.parentNode.removeChild(node)

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
export const createBoxedElementSection = (
  doc: Document,
  createElement: (tagName: string) => HTMLElement
) => {
  const body = doc.querySelector('body')
  const boxedTexts = body?.querySelectorAll('boxed-text') || []
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

export const moveFootnotes = (doc: Document, createElement: CreateElement) => {
  const group = doc.querySelector('back')
  if (!group) {
    return
  }
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
export const moveSpecialFootnotes = (
  doc: Document,
  sectionCategories: SectionCategory[],
  createElement: CreateElement
) => {
  const fns = [...doc.querySelectorAll('fn[fn-type]')]
  const group = doc.querySelector('back')
  if (!group) {
    return
  }
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
export const moveCaptionsToEnd = (doc: Document) => {
  const captions = doc.querySelectorAll('caption')

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

export const moveBackSectionsToStart = (doc: Document) => {
  const back = doc.querySelector('back')
  if (!back) {
    return
  }
  const sections = Array.from(back.querySelectorAll(':scope > sec'))
  for (const section of sections.reverse()) {
    back.insertBefore(section, back.firstChild)
  }
}

export const moveAcknowledgments = (
  doc: Document,
  createElement: CreateElement
) => {
  const group = doc.querySelector('back')
  if (!group) {
    return
  }
  const ack = doc.querySelector('back > ack')
  if (ack) {
    const section = createAcknowledgmentsSection(ack, createElement)
    removeNodeFromParent(ack)
    group.appendChild(section)
  }
}

export const moveFloatsGroupToBody = (
  doc: Document,
  createElement: CreateElement
) => {
  const body = doc.querySelector('body')
  const floatsGroup = doc.querySelector('floats-group')
  if (floatsGroup) {
    const sec = createFloatsGroupSection(floatsGroup, createElement)
    removeNodeFromParent(floatsGroup)
    body?.appendChild(sec)
  }
}

export const moveReferencesToBackmatter = (
  doc: Document,
  createElement: CreateElement
) => {
  const backmatter = doc.querySelector('back')
  const refList = backmatter?.querySelector('ref-list')
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

export const orderTableFootnote = (doc: Document) => {
  const rids = new Set(
    [...doc.querySelectorAll('tbody > xref[ref-type="fn"]')].map((xref) =>
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

export const fixTables = (doc: Document, createElement: CreateElement) => {
  const tableWraps = doc.querySelectorAll('table-wrap')
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
