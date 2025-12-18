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
import { XML_NAMESPACE } from '../../lib/xml'
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

export const joinParagraphsInCaption = (
  doc: Document,
  createElement: CreateElement
) => {
  const captions = doc.querySelectorAll('caption')
  for (const caption of captions) {
    const paragraph = createElement('p')
    caption.querySelectorAll('p').forEach((p, index) => {
      if (index > 0) {
        paragraph.append(' ')
      }
      paragraph.append(...p.childNodes)
      p.remove()
    })
    if (paragraph.childNodes.length) {
      caption.append(paragraph)
    }
  }
}

export const addMissingCaptions = (
  doc: Document,
  createElement: CreateElement
) => {
  const elements = doc.querySelectorAll(
    'fig, table-wrap, media, supplementary-material, boxed-text'
  )
  for (const element of elements) {
    let caption: Element | null = element.querySelector('caption')
    if (!caption) {
      caption = createElement('caption')
      element.nodeName === 'fig'
        ? element.appendChild(caption)
        : element.prepend(caption)
    }
    if (!caption.querySelector('title') && element.nodeName !== 'fig') {
      caption.prepend(createElement('title'))
    }
    if (
      !caption.querySelector('p') &&
      element.nodeName !== 'boxed-text' &&
      element.nodeName !== 'table-wrap'
    ) {
      caption.appendChild(createElement('p'))
    }
  }
}
export const createBoxedElementSection = (
  doc: Document,
  createElement: CreateElement
) => {
  const boxedTexts = doc.querySelectorAll('boxed-text')
  for (const boxedText of boxedTexts) {
    const containerSec = createElement('sec')
    const children = Array.from(boxedText.children).filter(
      (child) => child.localName !== 'label' && child.localName !== 'caption'
    )
    containerSec.append(...children)
    boxedText.appendChild(containerSec)
  }
}

export const createTitles = (front: Element, createElement: CreateElement) => {
  const titles = createElement('titles')
  let title = front.querySelector('article-meta > title-group > article-title')
  if (title) {
    title.innerHTML = htmlFromJatsNode(title, createElement) ?? defaultTitle
  } else {
    title = createElement('article-title')
    title.innerHTML = defaultTitle
  }
  titles.appendChild(title)

  const subtitles = front.querySelectorAll('subtitle')
  subtitles.forEach((subtitle) => {
    subtitle.innerHTML = htmlFromJatsNode(subtitle, createElement) ?? ''
    titles.appendChild(subtitle)
  })

  const altTitles = front.querySelectorAll(
    'article-meta > title-group > alt-title'
  )
  altTitles.forEach((altTitle) => {
    altTitle.innerHTML = htmlFromJatsNode(altTitle, createElement) ?? ''
    titles.appendChild(altTitle)
  })
  front.parentNode?.insertBefore(titles, front)
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
  front: Element,
  group: Element,
  createElement: CreateElement
) => {
  const abstracts = front.querySelectorAll(
    'article-meta > abstract, article-meta > trans-abstract'
  )
  abstracts.forEach((abstract) => {
    const sec = createAbstractSection(abstract, createElement)
    removeNodeFromParent(abstract)
    group.appendChild(sec)
  })
}

export const moveHeroImage = (doc: Document) => {
  const heroImage = doc.querySelector('graphic[content-type="leading"]')
  if (!heroImage) {
    return
  }
  const back = doc.querySelector('back')
  if (back) {
    back.parentNode?.insertBefore(heroImage, back.nextSibling)
  } else {
    doc.documentElement.appendChild(heroImage)
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
  body.append(group)
}

export const createAbstracts = (
  front: Element,
  body: Element,
  createElement: CreateElement
) => {
  const group = createSectionGroup('abstracts', createElement)
  moveAbstracts(front, group, createElement)
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
  moveAcknowledgments(doc, group, createElement)
  moveFootnotes(doc, group, createElement)
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
    group.appendChild(section)
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
      const fnTitle =
        fn.querySelector('label') ||
        fn.querySelector('p[content-type="fn-title"]')
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
  const sectionType = abstractType ? `abstract-${abstractType}` : 'abstract'
  let section = createElement('sec')
  if (abstract.nodeName === 'trans-abstract') {
    section = createElement('trans-abstract')
    const lang = abstract.getAttributeNS(XML_NAMESPACE, 'lang')
    if (lang) {
      section.setAttributeNS(XML_NAMESPACE, 'lang', lang)
    }
  }
  section.setAttribute('sec-type', sectionType)
  if (!abstract.querySelector(':scope > title')) {
    const title = createElement('title')
    title.textContent = abstractType
      ? `${capitalizeFirstLetter(abstractType.split('-').join(' '))} Abstract`
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
    title.textContent = 'Supplements'
    section.append(title)
    section.append(...suppls)
    body.append(section)
  }
}

export const createAccessibilityItems = (
  doc: Document,
  createElement: CreateElement
) => {
  doc
    .querySelectorAll('media, fig, table-wrap, graphic:not(fig graphic)')
    .forEach((item) => {
      const altText =
        item.querySelector('alt-text') || createElement('alt-text')
      const longDesc =
        item.querySelector('long-desc') || createElement('long-desc')
      item?.appendChild(altText)
      item?.appendChild(longDesc)
    })
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

export const createAttachments = (
  doc: Document,
  createElement: CreateElement
) => {
  const attachments = createElement('attachments')
  doc
    .querySelectorAll('self-uri')
    .forEach((attachment) => attachments.appendChild(attachment))
  if (attachments.children.length > 0) {
    doc.documentElement.appendChild(attachments)
  }
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
