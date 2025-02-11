/*!
 * © 2025 Atypon Systems LLC
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
import { v4 as uuid } from 'uuid'

import { schema, SectionCategory } from '../../../schema'
import { generateNodeID } from '../../../transformer'

export class JatsProcessor {
  private readonly doc: Document
  private readonly sectionCategories: SectionCategory[]
  constructor(doc: Document, sectionCateogries: SectionCategory[]) {
    this.doc = doc
    this.sectionCategories = sectionCateogries
  }

  private createElement = (tag: string) => this.doc.createElement(tag)

  process() {
    this.markComments()
    this.addMissingCaptions()
    this.moveCaptionsToEnd()
    this.createBoxedElementSection()
    this.moveFloatsGroupToBody()
    this.fixTables()
    this.orderTableFootnote()
    this.refactorBackmatter()
  }
  private refactorBackmatter() {
    const back = this.doc.querySelector('back')
    if (!back) {
      return
    }
    this.moveSectionsToTop(back)
    this.moveSpecialFootnotes(back)
    this.moveFootnotes(back)
    this.moveAcknowledgments(back)
    this.moveReferencesToBackmatter(back)
  }
  private moveSectionsToTop(back: Element) {
    const sections = Array.from(back.querySelectorAll(':scope > sec'))
    for (const section of sections.reverse()) {
      back.insertBefore(section, back.firstChild)
    }
  }
  private moveReferencesToBackmatter(back: Element) {
    const refList = back.querySelector('ref-list')
    if (!refList) {
      return
    }
    JatsProcessor.removeNodeFromParent(refList)
    const section = this.createElement('sec')
    section.setAttribute('sec-type', 'bibliography')
    const title = this.createElement('title')
    title.textContent = 'References'
    section.appendChild(title)
    section.appendChild(refList)
    back.appendChild(section)
  }
  private moveSpecialFootnotes = (group: Element) => {
    const fns = [...this.doc.querySelectorAll('fn[fn-type]')]
    for (const fn of fns) {
      const type = fn.getAttribute('fn-type') || '' //Cannot be null since it is queried above
      const category = this.sectionCategories.find((category) =>
        category.synonyms.includes(type)
      )
      if (category) {
        const section = this.createElement('sec')
        const fnTitle = fn.querySelector('p[content-type="fn-title"]')
        if (fnTitle) {
          const title = this.createElement('title')
          const titleText = fnTitle.textContent?.trim()
          if (titleText) {
            title.textContent = titleText
          }
          JatsProcessor.removeNodeFromParent(fnTitle)
          section.append(title)
        }
        section.append(...fn.children)
        JatsProcessor.removeNodeFromParent(fn)
        section.setAttribute('sec-type', category.id)
        group.append(section)
      }
    }
  }
  private moveFootnotes = (group: Element) => {
    const fns = [
      ...this.doc.querySelectorAll(
        'fn:not(table-wrap-foot fn, author-notes fn)'
      ),
    ]
    let section = this.doc.querySelector('sec[sec-type="endnotes"]')
    const fnGroup =
      section?.querySelector('fn-group') || this.createElement('fn-group')
    fns.forEach((fn) => {
      if (!fn.getAttribute('fn-type')) {
        fnGroup.appendChild(fn)
      }
    })
    if (!section && fnGroup.innerHTML) {
      section = this.createFootnotesSection([fnGroup])
    }
    if (section) {
      group.insertBefore(
        section,
        group.firstChild?.nextSibling || group.firstChild
      )
    }
  }
  private createFootnotesSection = (fnGroups: Element[]) => {
    const section = this.createElement('sec')
    section.setAttribute('sec-type', 'endnotes')

    const titleNode = fnGroups
      .map((g) => g.querySelector('title'))
      .filter((t) => t !== null)[0]

    if (titleNode) {
      section.appendChild(titleNode)
    } else {
      const title = this.createElement('title')
      title.textContent = 'Footnotes'
      section.appendChild(title)
    }

    for (const fnGroup of fnGroups) {
      section.appendChild(fnGroup)
    }

    return section
  }
  private moveAcknowledgments = (group: Element) => {
    const ack = this.doc.querySelector('back > ack')
    if (ack) {
      const section = this.createAcknowledgmentsSection(ack)
      JatsProcessor.removeNodeFromParent(ack)
      group.appendChild(section)
    }
  }
  private createAcknowledgmentsSection(ack: Element) {
    const section = this.createElement('sec')
    section.setAttribute('sec-type', 'acknowledgments')

    if (!ack.querySelector('title')) {
      const title = this.createElement('title')
      title.textContent = 'Acknowledgements'
      section.appendChild(title)
    }

    while (ack.firstChild) {
      section.appendChild(ack.firstChild)
    }
    return section
  }
  private markComments() {
    const root = this.doc.getRootNode() as Element
    const queue: Element[] = [root]
    const comments = this.createElement('comments')
    while (queue.length !== 0) {
      const node = queue.shift()
      if (node) {
        if (JatsProcessor.isJATSComment(node)) {
          const text = JatsProcessor.parseJATSComment(node)
          if (text) {
            const id = generateNodeID(schema.nodes.comment)
            let target
            const parent = node.parentNode as Element
            if (JatsProcessor.isHighlightable(parent)) {
              const marker = this.createHighlightMarkerElement(id)
              parent.insertBefore(marker, node)
              target = parent
            } else {
              target = JatsProcessor.findTarget(parent)
            }
            // if the target has no ID, generate one here and rely on
            // updateDocumentIDs to fix it
            if (!target.id) {
              target.id = uuid()
            }
            const comment = this.createCommentElement(id, target.id, text)
            comments.appendChild(comment)
          }
        }
        node.childNodes.forEach((child) => {
          queue.push(child as Element)
        })
      }
    }
    if (comments.hasChildNodes()) {
      this.doc.documentElement.appendChild(comments)
    }
  }
  private addMissingCaptions = () => {
    const elements = this.doc.querySelectorAll('fig, table-wrap, media')
    for (const element of elements) {
      let caption: Element | null = element.querySelector('caption')
      if (!caption) {
        caption = this.createElement('caption')
        element.nodeName === 'fig'
          ? element.appendChild(caption)
          : element.prepend(caption)
      }
      if (!caption.querySelector('title')) {
        caption.prepend(this.createElement('title'))
      }
      if (!caption.querySelector('p')) {
        caption.appendChild(this.createElement('p'))
      }
    }
  }
  private moveCaptionsToEnd() {
    const captions = this.doc.querySelectorAll('caption')

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
  private createBoxedElementSection() {
    const body = this.doc.querySelector('body')
    const boxedTexts = body?.querySelectorAll('boxed-text') || []
    for (const boxedText of boxedTexts) {
      const boxElementId = boxedText.getAttribute('id')
      const boxElementSec = this.createElement('sec')
      boxElementSec.setAttribute('sec-type', 'box-element')
      if (boxElementId) {
        boxElementSec.setAttribute('id', boxElementId)
      }
      const title = this.createElement('title')
      title.textContent = 'BoxElement'
      boxElementSec.append(title)
      for (const element of [...boxedText.children]) {
        if (element?.tagName === 'label' || element?.tagName === 'caption') {
          boxElementSec.append(element)
        }
      }
      const containerSection = this.createElement('sec')
      containerSection.append(...boxedText.children)
      boxElementSec.append(containerSection)
      boxedText.replaceWith(boxElementSec)
    }
  }
  private moveFloatsGroupToBody() {
    //is this actually needed?
    const body = this.doc.querySelector('body')
    const floatsGroup = this.doc.querySelector('floats-group')
    if (floatsGroup) {
      const sec = this.createFloatsGroupSection(floatsGroup)
      JatsProcessor.removeNodeFromParent(floatsGroup)
      body?.appendChild(sec)
    }
  }
  private fixTables() {
    const tableWraps = this.doc.querySelectorAll('table-wrap')
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
        const colgroup = this.createElement('colgroup')
        for (const col of cols) {
          colgroup.appendChild(col)
        }
        tableWrap.insertBefore(colgroup, table.nextSibling)
      }
      const tableFootWrap = tableWrap.querySelector('table-wrap-foot')
      if (tableFootWrap) {
        const paragraphs = tableFootWrap.querySelectorAll(':scope > p')
        if (paragraphs.length) {
          const generalTableFootnote = this.createElement(
            'general-table-footnote'
          )
          for (const paragraph of paragraphs) {
            JatsProcessor.removeNodeFromParent(paragraph)
            generalTableFootnote.append(paragraph)
          }
          tableFootWrap.prepend(generalTableFootnote)
        }
      }
    })
  }
  private orderTableFootnote() {
    const rids = new Set(
      [...this.doc.querySelectorAll('tbody > xref[ref-type="fn"]')].map(
        (xref) => xref.getAttribute('rid')
      )
    )
    const fnGroups = this.doc.querySelectorAll('table-wrap-foot > fn-group')
    fnGroups.forEach((fnGroup) => {
      // sort the un-cited table footnote at the end of list
      const fns = [...fnGroup.querySelectorAll('fn')].sort((fn) =>
        rids.has(fn.getAttribute('id')) ? -1 : 0
      )
      fnGroup.replaceChildren(...fns)
    })
  }
  private createFloatsGroupSection(floatsGroup: Element) {
    const section = this.createElement('sec')
    section.setAttribute('sec-type', 'floating-element')
    const title = this.createElement('title')
    title.textContent = 'Floating Group'
    section.appendChild(title)
    section.append(...floatsGroup.children)
    return section
  }
  private createHighlightMarkerElement(id: string) {
    const highlightMarker = this.createElement('highlight-marker')
    highlightMarker.setAttribute('id', id)
    highlightMarker.setAttribute('position', 'point')
    return highlightMarker
  }
  private createCommentElement = (
    id: string,
    targetID: string | undefined,
    text: string
  ) => {
    const commentElement = this.createElement('comment')
    commentElement.setAttribute('id', id)
    if (targetID) {
      commentElement.setAttribute('target-id', targetID)
    }
    commentElement.textContent = text
    return commentElement
  }
  private static isJATSComment(node: Node) {
    return (
      node.nodeType === node.PROCESSING_INSTRUCTION_NODE &&
      node.nodeName === 'AuthorQuery'
    )
  }
  private static parseJATSComment(node: Node) {
    const text = node.textContent
    if (text) {
      const queryText = /queryText="(.+)"/.exec(text)
      return (queryText && queryText[1]) || undefined
    }
  }
  private static isHighlightable(node: Element) {
    //todo find a better way to do this
    return node.nodeName === 'p'
  }
  private static findTarget(node: Element) {
    const target = node.closest('ref, kwd-group')
    if (target) {
      return target
    }
    return node
  }
  public static removeNodeFromParent = (node: Element) =>
    node.parentNode && node.parentNode.removeChild(node)
}
