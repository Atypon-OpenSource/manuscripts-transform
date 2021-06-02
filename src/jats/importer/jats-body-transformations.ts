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

const removeNodeFromParent = (node: Element) =>
  node.parentNode && node.parentNode.removeChild(node)

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
    const section = createElement('sec')
    section.setAttribute('sec-type', 'abstract')

    const title = createElement('title')
    title.textContent = 'Abstract'
    section.appendChild(title)

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
    titleNode: Element | null,
    bibliography: Element | null,
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'bibliography')

    if (titleNode) {
      section.appendChild(titleNode)
    } else {
      const title = createElement('title')
      title.textContent = 'Bibliography'
      section.appendChild(title)
    }

    if (bibliography) {
      const bib = createElement('bibliography')
      bib.appendChild(bibliography)
      section.appendChild(bib)
    }

    return section
  },
  createFootnotes(
    footnoteGroups: Element[],
    createElement: (tagName: string) => HTMLElement
  ) {
    const section = createElement('sec')
    section.setAttribute('sec-type', 'notes')

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
  moveSectionsToBody(
    doc: Document,
    body: Element,
    bibliographyEl: Element | null,
    createElement: (tagName: string) => HTMLElement
  ) {
    const abstractNode = doc.querySelector('front > article-meta > abstract')
    if (abstractNode) {
      const abstract = this.createAbstract(abstractNode, createElement)
      removeNodeFromParent(abstractNode)
      body.insertBefore(abstract, body.firstChild)
    }

    // move sections from back to body
    for (const section of doc.querySelectorAll('back > sec')) {
      removeNodeFromParent(section)
      body.appendChild(section)
    }

    // move acknowledg(e)ments from back to body section
    const ackNode = doc.querySelector('back > ack')
    if (ackNode) {
      const acknowledgements = this.createAcknowledgments(
        ackNode,
        createElement
      )
      removeNodeFromParent(ackNode)
      body.appendChild(acknowledgements)
    }

    //move appendices from back to body
    const appGroup = doc.querySelectorAll('back > app-group > app')

    for (const app of appGroup) {
      const appendix = this.createAppendixSection(app, createElement)
      removeNodeFromParent(app)
      body.appendChild(appendix)
    }
    // move bibliography from back to body section
    const refList = doc.querySelector('back > ref-list')
    if (refList) {
      const bibliography = this.createBibliography(
        refList.querySelector('title'),
        bibliographyEl,
        createElement
      )
      removeNodeFromParent(refList)
      body.appendChild(bibliography)
    }

    // move footnotes without fn-type from back to body section
    const footnoteGroups = [
      ...doc.querySelectorAll('back > fn-group:not([fn-type])'),
    ]
    if (footnoteGroups.length > 0) {
      footnoteGroups.map((g) => removeNodeFromParent(g))
      const footnotes = this.createFootnotes(footnoteGroups, createElement)
      body.appendChild(footnotes)
    }
  },
  // wrap single figures in fig-group
  wrapFigures(body: Element, createElement: (tagName: string) => HTMLElement) {
    const figures = body.querySelectorAll('sec > fig')

    for (const figure of figures) {
      const figType = figure.getAttribute('fig-type')

      // only wrap actual figures
      if (figType && figType !== 'figure') {
        continue
      }

      const section = figure.parentNode as Element

      const figGroup = createElement('fig-group')
      section.insertBefore(figGroup, figure)

      // move id from figure to fig-group
      const figureID = figure.getAttribute('id')
      if (figureID) {
        figGroup.setAttribute('id', figureID)
      }
      figure.removeAttribute('id')

      // move caption into fig-group
      const figCaption = figure.querySelector('caption')
      if (figCaption) {
        figGroup.appendChild(figCaption)
      }

      const graphics = figure.querySelectorAll('graphic')

      if (graphics.length > 1) {
        // TODO: copy attributes?
        section.removeChild(figure)

        // split multiple graphics into separate sub-figures
        for (const graphic of graphics) {
          const figure = createElement('figure')
          figure.appendChild(graphic)
          figGroup.appendChild(figure)
        }
      } else {
        // move single- or no-graphic figure into fig-group
        figGroup.appendChild(figure)
      }
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
  // unwrap paragraphs in captions
  unwrapParagraphsInCaptions(body: Element) {
    const captions = body.querySelectorAll('caption')

    for (const caption of captions) {
      const paragraphNodes = caption.querySelectorAll('p')

      paragraphNodes.forEach((paragraphNode) => {
        if (paragraphNode.parentNode) {
          while (paragraphNode.firstChild) {
            paragraphNode.parentNode.insertBefore(
              paragraphNode.firstChild,
              paragraphNode
            )
          }

          paragraphNode.parentNode.removeChild(paragraphNode)
        }
      })
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
}
