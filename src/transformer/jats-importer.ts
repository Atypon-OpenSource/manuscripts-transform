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
  AuxiliaryObjectReference,
  BibliographicName,
  Manuscript,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'
import mime from 'mime'
import { DOMParser, Fragment, ParseRule } from 'prosemirror-model'

import { convertMathMLToSVG } from '../mathjax/mathml-to-svg'
import { convertTeXToSVG } from '../mathjax/tex-to-svg'
import { ManuscriptNode, Marks, Nodes, schema } from '../schema'
import {
  Build,
  buildAffiliation,
  buildAuxiliaryObjectReference,
  buildBibliographicDate,
  buildBibliographicName,
  buildBibliographyItem,
  buildCitation,
  buildContributor,
  buildKeyword,
  buildManuscript,
} from './builders'
import { createNewBundle, createParentBundle } from './bundles'
import { loadBundlesMap, loadIssnBundleIndex } from './bundles-data'
import { encode } from './encode'
import { generateID } from './id'
import { Journal, parseJournalMeta, TypedValue } from './jats-journal-meta'
import { AddModel, addModelToMap } from './model-map'
import { nodeTypesMap } from './node-types'
import { hasObjectType } from './object-types'
import { chooseSectionCategory } from './section-category'
import { xmlSerializer } from './serializer'

// TODO: remove element.getAttribute('id') and rewrite cross-references?

// https://jats.nlm.nih.gov/articleauthoring/tag-library/1.2/

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export type MarkRule = ParseRule & { mark: Marks | null }

const marks: MarkRule[] = [
  {
    tag: 'bold',
    mark: 'bold',
  },
  {
    tag: 'code',
    mark: 'code',
  },
  {
    tag: 'italic',
    mark: 'italic',
  },
  {
    tag: 'sc',
    mark: 'smallcaps',
  },
  {
    tag: 'strike',
    mark: 'strikethrough',
  },
  {
    tag: 'styled-content',
    mark: 'styled',
    getAttrs: (node) => ({
      style: (node as Element).getAttribute('style'),
    }),
  },
  {
    tag: 'sub',
    mark: 'subscript',
  },
  {
    tag: 'sup',
    mark: 'superscript',
  },
  {
    tag: 'underline',
    mark: 'underline',
  },
]

export type NodeRule = ParseRule & { node?: Nodes | null }

const nodes: NodeRule[] = [
  {
    tag: 'attrib',
    node: 'attribution',
  },
  {
    tag: 'back',
    ignore: true,
  },
  {
    tag: 'body',
    node: 'manuscript',
  },
  {
    tag: 'break',
    node: 'hard_break',
  },
  {
    tag: 'caption',
    node: 'figcaption',
    context: 'figure/',
  },
  {
    tag: 'caption',
    node: 'figcaption',
    context: 'figure_element/',
  },
  {
    tag: 'caption',
    node: 'figcaption',
    context: 'table_element/',
  },
  {
    tag: 'code',
    node: 'listing',
    context: 'listing_element/',
    // preserveWhitespace: 'full',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        language: element.getAttribute('language') ?? '',
        contents: element.textContent?.trim() ?? '',
      }
    },
  },
  {
    tag: 'disp-formula',
    node: 'equation_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const caption = element.querySelector('figcaption')

      return {
        id: element.getAttribute('id'),
        suppressCaption: !caption,
      }
    },
    getContent: (node, schema) => {
      const element = node as HTMLElement

      const attrs: {
        MathMLStringRepresentation: string
        SVGStringRepresentation: string
        TeXRepresentation: string
      } = {
        // id: generateID(ObjectTypes.Equation)
        MathMLStringRepresentation: '',
        SVGStringRepresentation: '',
        TeXRepresentation: '',
      }

      const container = element.querySelector('alternatives') ?? element

      for (const child of container.childNodes) {
        // remove namespace prefix
        // TODO: real namespaces
        const nodeName = child.nodeName.replace(/^[a-z]:/, '')

        switch (nodeName) {
          case 'tex-math':
            attrs.TeXRepresentation = child.textContent?.trim() ?? ''
            if (attrs.TeXRepresentation) {
              attrs.SVGStringRepresentation =
                convertTeXToSVG(attrs.TeXRepresentation, true) ?? ''
            }
            break

          case 'mml:math':
            ;(child as Element).removeAttribute('id')
            // TODO: remove namespace?
            attrs.MathMLStringRepresentation = xmlSerializer.serializeToString(
              child
            )
            // TODO: convert MathML to TeX with mml2tex?
            if (attrs.MathMLStringRepresentation) {
              attrs.SVGStringRepresentation =
                convertMathMLToSVG(attrs.MathMLStringRepresentation, true) ?? ''
            }
            // TODO: add format property (TeX or MathML)
            // TODO: make MathMLRepresentation editable
            break
        }
      }

      const caption = element.querySelector('figcaption')

      const figcaption = schema.nodes.figcaption.create()

      return Fragment.from([
        schema.nodes.equation.createChecked(attrs),
        caption
          ? parser.parse(caption, {
              topNode: figcaption,
            })
          : figcaption,
      ]) as Fragment
    },
  },
  {
    tag: 'disp-quote[content-type=quote]',
    node: 'blockquote_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'disp-quote[content-type=pullquote]',
    node: 'pullquote_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'ext-link',
    node: 'link',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        href: element.getAttributeNS(XLINK_NAMESPACE, 'href') || '',
        title: element.getAttributeNS(XLINK_NAMESPACE, 'title') || '',
      }
    },
  },
  {
    tag: 'fig[fig-type=equation]',
    node: 'equation_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'fig[fig-type=listing]',
    node: 'listing_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'fig',
    node: 'figure',
    context: 'figure_element/',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const labelNode = element.querySelector('label')
      const graphicNode = element.querySelector('graphic')
      const mediaNode = element.querySelector('media')
      const externalFileReferences: Array<{ url: string; kind?: string }> = []

      const originalURL = graphicNode
        ? graphicNode.getAttributeNS(XLINK_NAMESPACE, 'href')
        : undefined
      if (originalURL) {
        externalFileReferences.push({
          url: originalURL,
          kind: 'imageRepresentation',
        })
      }

      const embedURL = mediaNode
        ? mediaNode.getAttributeNS(XLINK_NAMESPACE, 'href')
        : undefined

      if (embedURL) {
        externalFileReferences.push({ url: embedURL })
      }

      return {
        id: element.getAttribute('id'),
        label: labelNode?.textContent?.trim() ?? '',
        contentType: chooseContentType(graphicNode || undefined) || '',
        originalURL,
        embedURL,
        externalFileReferences:
          externalFileReferences.length > 0
            ? externalFileReferences
            : undefined,
      }
    },
  },
  {
    tag: 'fig-group',
    node: 'figure_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'fn-group',
    node: 'footnotes_element',
    context: 'footnotes_section/', // TODO: in table footer
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        kind: 'footnote', // TODO: 'endnote' depending on position or attribute?
      }
    },
  },
  {
    tag: 'table-wrap-foot',
    node: 'footnotes_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        kind: 'table_footnote', // TODO: 'table_endnote' depending on position or attribute?
      }
    },
  },
  {
    tag: 'fn',
    node: 'footnote',
    context: 'footnotes_element/', // TODO: in table footer
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        kind: 'footnote', // TODO: 'endnote' depending on position or attribute?
      }
    },
  },
  {
    tag: 'front',
    ignore: true,
  },
  {
    tag: 'inline-formula',
    node: 'inline_equation',
    getAttrs: (node) => {
      const element = node as HTMLElement

      const attrs: {
        id: string | null
        MathMLRepresentation: string // NOTE: not MathMLStringRepresentation
        SVGRepresentation: string // NOTE: not SVGStringRepresentation
        TeXRepresentation: string
      } = {
        id: element.getAttribute('id'),
        MathMLRepresentation: '', // default
        SVGRepresentation: '',
        TeXRepresentation: '', // default
      }

      const container = element.querySelector('alternatives') ?? element

      for (const child of container.childNodes) {
        // remove namespace prefix
        // TODO: real namespaces
        const nodeName = child.nodeName.replace(/^[a-z]:/, '')

        switch (nodeName) {
          case 'tex-math':
            attrs.TeXRepresentation = child.textContent?.trim() ?? ''
            if (attrs.TeXRepresentation) {
              attrs.SVGRepresentation =
                convertTeXToSVG(attrs.TeXRepresentation, true) ?? ''
            }
            break

          case 'mml:math':
            ;(child as Element).removeAttribute('id')
            // FIXME: remove namespace?
            attrs.MathMLRepresentation = xmlSerializer.serializeToString(child)
            // TODO: convert MathML to TeX with mml2tex?
            if (attrs.MathMLRepresentation) {
              attrs.SVGRepresentation =
                convertMathMLToSVG(attrs.MathMLRepresentation, true) ?? ''
            }
            // TODO: add format property (TeX or MathML)
            // TODO: make MathMLRepresentation editable
            break
        }
      }

      return attrs
    },
  },
  {
    tag: 'list[list-type=bullet]',
    node: 'bullet_list',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'list[list-type=order]',
    node: 'ordered_list',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'list-item',
    node: 'list_item',
  },
  // {
  //   tag: 'math',
  //   namespace: 'http://www.w3.org/1998/Math/MathML',
  //   node: 'equation',
  // },
  {
    tag: 'p',
    node: 'paragraph',
    context: 'section/',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'p',
    node: 'paragraph',
  },
  {
    tag: 'sec[sec-type="notes"]',
    node: 'footnotes_section', // NOTE: higher priority than 'section'
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        // category: chooseSectionCategory(element), // 'MPSectionCategory:endnotes',
      }
    },
  },
  {
    tag: 'sec',
    node: 'section',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        category: chooseSectionCategory(element),
      }
    },
  },
  {
    tag: 'label',
    context: 'section/',
    ignore: true, // TODO
  },
  {
    tag: 'label',
    context: 'figure/',
    ignore: true, // TODO
  },
  {
    tag: 'table',
    node: 'table',
    // TODO: count thead and tfoot rows
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'table-wrap',
    node: 'table_element',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        id: element.getAttribute('id'),
        suppressFooter: !element.querySelector('table > tfoot > tr'),
        suppressHeader: !element.querySelector('table > thead > tr'),
      }
    },
  },
  {
    tag: 'tbody',
    skip: true,
  },
  {
    tag: 'tfoot',
    skip: true,
  },
  {
    tag: 'thead',
    skip: true,
  },
  {
    tag: 'title',
    node: 'section_title',
    context: 'section/|footnotes_section/',
  },
  {
    tag: 'tr',
    node: 'table_row',
  },
  {
    tag: 'td',
    node: 'table_cell',
  },
  {
    tag: 'th',
    node: 'table_cell',
  },
  {
    tag: 'xref[ref-type="bibr"]',
    node: 'citation',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        rid: element.getAttribute('rid'),
        contents: element.textContent, // TODO: innerHTML?
      }
    },
  },
  {
    tag: 'xref[ref-type="fn"]',
    node: 'inline_footnote',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        rid: element.getAttribute('rid'),
        contents: element.textContent,
      }
    },
  },
  {
    tag: 'xref',
    node: 'cross_reference',
    getAttrs: (node) => {
      const element = node as HTMLElement

      return {
        rid: element.getAttribute('rid'),
        label: element.textContent,
      }
    },
  },
]

// metadata
// address, addr-line, aff, article-title, city,

export const jatsRules = [...marks, ...nodes]

const parser = new DOMParser(schema, jatsRules)

// wrap single figures in fig-group
export const wrapFigures = (body: Element) => {
  const doc = body.ownerDocument as Document

  const figures = body.querySelectorAll('sec > fig')

  for (const figure of figures) {
    const figType = figure.getAttribute('fig-type')

    // only wrap actual figures
    if (figType && figType !== 'figure') {
      continue
    }

    const section = figure.parentNode as Element

    const figGroup = doc.createElement('fig-group')
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
        const figure = doc.createElement('figure')
        figure.appendChild(graphic)
        figGroup.appendChild(figure)
      }
    } else {
      // move single- or no-graphic figure into fig-group
      figGroup.appendChild(figure)
    }
  }
}

// move captions to the end of their containers
export const moveCaptionsToEnd = (body: Element) => {
  const captions = body.querySelectorAll('caption')

  for (const caption of captions) {
    if (caption.parentNode) {
      caption.parentNode.appendChild(caption)
    }
  }
}

// unwrap paragraphs in captions
export const unwrapParagraphsInCaptions = (body: Element) => {
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
}

const isAuxiliaryObjectReference = hasObjectType<AuxiliaryObjectReference>(
  ObjectTypes.AuxiliaryObjectReference
)

// add/rewrite ids
export const rewriteIDs = (
  output: ManuscriptNode,
  modelMap: Map<string, Model>
) => {
  const replacements = new Map<string, string>()

  output.descendants((node) => {
    // nodes that need an id
    if ('id' in node.attrs) {
      const objectType = nodeTypesMap.get(node.type)

      if (!objectType) {
        return
        // throw new Error(`Unknown object type for node type ${node.type.name}`)
      }

      const nextID = generateID(objectType)

      const previousID = node.attrs.id

      if (previousID) {
        if (replacements.has(previousID)) {
          throw new Error(`ID ${previousID} exists twice!`)
          // TODO: warn and ignore instead?
        }

        replacements.set(previousID, nextID)
      }

      node.attrs.id = nextID
    }
  })

  // replace cross-reference rids

  output.descendants((node) => {
    // nodes that have an rid
    if ('rid' in node.attrs) {
      const previousRID = node.attrs.rid

      if (previousRID) {
        if (replacements.has(previousRID)) {
          node.attrs.rid = replacements.get(previousRID)
        } else {
          // console.warn(`Missing replacement for ${previousRID}`)
        }
      }
    }
  })

  // fix references to elements from models
  for (const model of modelMap.values()) {
    if (isAuxiliaryObjectReference(model)) {
      const newReferencedId = replacements.get(model.referencedObject)

      if (newReferencedId) {
        model.referencedObject = newReferencedId
      } else {
        // console.warn(`Missing replacement for ${model.referencedObject}`)
      }
    }
  }
}

const moveSectionsToBody = (doc: Document) => {
  const body = doc.querySelector('body')

  if (body) {
    // move abstract from front to body
    const abstractNode = doc.querySelector('front > article-meta > abstract')

    if (abstractNode) {
      const section = doc.createElement('sec')
      section.setAttribute('sec-type', 'abstract')

      const title = doc.createElement('title')
      title.textContent = 'Abstract'
      section.appendChild(title)

      while (abstractNode.firstChild) {
        section.appendChild(abstractNode.firstChild)
      }

      if (abstractNode.parentNode) {
        abstractNode.parentNode.removeChild(abstractNode)
      }

      body.insertBefore(section, body.firstChild)
    }

    // move sections from back to body
    for (const section of doc.querySelectorAll('back > sec')) {
      body.appendChild(section)
    }

    // move acknowledg(e)ments from back to body section
    const ack = doc.querySelector('back > ack')

    if (ack) {
      const section = doc.createElement('sec')
      section.setAttribute('sec-type', 'acknowledgments')

      const titleNode = ack.querySelector('title')

      if (titleNode) {
        section.appendChild(titleNode)
      } else {
        const title = doc.createElement('title')
        title.textContent = 'Acknowledgements'
        section.appendChild(title)
      }

      while (ack.firstChild) {
        section.appendChild(ack.firstChild)
      }

      if (ack.parentNode) {
        ack.parentNode.removeChild(ack)
      }

      body.appendChild(section)
    }

    // move bibliography from back to body section
    const refList = doc.querySelector('back > ref-list')

    if (refList) {
      const section = doc.createElement('sec')
      section.setAttribute('sec-type', 'bibliography')

      const titleNode = refList.querySelector('title')

      if (titleNode) {
        section.appendChild(titleNode)
      } else {
        const title = doc.createElement('title')
        title.textContent = 'Bibliography'
        section.appendChild(title)
      }

      // TODO: generate bibliography?

      body.appendChild(section)
    }

    // check for footnotes and check if the section for them created
    let footnotesSection = doc.querySelector('sec[sec-type="notes"]')
    // move footnotes without fn-type from back to body section
    const footnoteGroups = doc.querySelectorAll(
      'back > fn-group:not([fn-type])'
    )

    if (!footnotesSection && footnoteGroups.length) {
      footnotesSection = doc.createElement('sec')
      footnotesSection.setAttribute('sec-type', 'notes')
    }

    if (footnotesSection) {
      let title = doc.querySelector('fn-group title')
      if (!title) {
        title = doc.createElement('title')
        title.textContent = 'Footnotes'
        footnotesSection.appendChild(title)
      }
    }
    if (footnoteGroups.length && footnotesSection) {
      for (const footnoteGroup of footnoteGroups) {
        footnotesSection.appendChild(footnoteGroup)
      }
      body.appendChild(footnotesSection)
    }
  }
}

const ensureSection = (body: Element) => {
  const doc = body.ownerDocument as Document
  // Create and add a section if there is no section the content can be appended into
  let section = doc.createElement('sec') as Element
  const { firstElementChild } = body
  if (firstElementChild && firstElementChild.tagName === 'sec') {
    section = firstElementChild
  } else {
    body.insertBefore(section, body.firstChild)
  }

  // Move any element without a section to the previous section
  body.childNodes.forEach((child) => {
    if (child.nodeType === doc.ELEMENT_NODE) {
      const element = child as Element
      if (element.tagName !== 'sec') {
        section.appendChild(element)
      } else {
        section = element
      }
    }
  })
}

export const parseJATSBody = (
  doc: Document,
  modelMap: Map<string, Model>
): ManuscriptNode => {
  const body = doc.querySelector('body')

  if (!body) {
    throw new Error('No body element found!')
  }

  // fix up the document
  ensureSection(body)
  moveSectionsToBody(doc)
  wrapFigures(body)
  moveCaptionsToEnd(body)
  unwrapParagraphsInCaptions(body)

  const node = parser.parse(body)

  rewriteIDs(node, modelMap)

  return node
}

// JATS to HTML conversion
const jatsToHtmlElementMap = new Map<string, string>([
  ['bold', 'b'],
  ['italic', 'i'],
  ['sc', 'style'], // TODO: style
  ['sub', 'sub'],
  ['sup', 'sup'],
])

const renameNodes = (
  node: Node,
  container: Node,
  nodeNameMap: Map<string, string>
) => {
  if (node.childNodes) {
    const document = container.ownerDocument as Document

    node.childNodes.forEach((childNode) => {
      switch (childNode.nodeType) {
        case Node.ELEMENT_NODE: {
          const newNodeName = nodeNameMap.get(childNode.nodeName)

          if (newNodeName) {
            const newNode = document.createElement(newNodeName)
            renameNodes(childNode, newNode, nodeNameMap)
            container.appendChild(newNode)
          } else {
            console.warn(`Unhandled node name: ${newNodeName}`)
            container.appendChild(childNode.cloneNode())
          }
          break
        }

        case Node.TEXT_NODE:
        default: {
          container.appendChild(childNode.cloneNode())
          break
        }
      }
    })
  }
}

const buildJournal = (journalMeta: Element | null): Partial<Journal> | null => {
  if (!journalMeta) {
    return null
  }

  return {
    ...parseJournalMeta(journalMeta),
    // objectType: ObjectTypes.Journal,
    // _id: generateID(ObjectTypes.Journal),
  }
}

const chooseBundle = async (
  issns: TypedValue[]
): Promise<string | undefined> => {
  const issnBundleIndex = await loadIssnBundleIndex()

  for (const { value: issn } of issns) {
    const normalizedIssn = issn.toUpperCase().replace(/[^0-9X]/g, '')

    if (normalizedIssn in issnBundleIndex) {
      return issnBundleIndex[normalizedIssn]
    }
  }
}

export const parseJATSFront = async (
  doc: Document,
  addModel: AddModel
): Promise<void> => {
  const front = doc.querySelector('front')

  if (!front) {
    throw new Error('No front element found!')
  }

  // manuscript

  const manuscript = buildManuscript() as Build<Manuscript> & {
    keywordIDs?: string[]
  }

  // journal metadata

  const journalMeta = doc.querySelector('front > journal-meta')

  const journal = buildJournal(journalMeta)

  // if (journal) {
  //   addModel<Journal>(journal) // TODO: store read-only Journal object for display?
  // }

  // manuscript bundle (CSL style)
  if (journal && journal.issns) {
    const bundleID = await chooseBundle(journal.issns)

    if (bundleID) {
      const bundlesMap = await loadBundlesMap()

      const bundle = createNewBundle(bundleID, bundlesMap)

      if (bundle) {
        const parentBundle = createParentBundle(bundle, bundlesMap)
        if (parentBundle) {
          addModel(parentBundle)
          // TODO: attach CSL style as attachment?
        }

        addModel(bundle)
        // TODO: attach CSL style as attachment?

        manuscript.bundle = bundle._id
      }

      // TODO: choose template using bundle identifier?
    }
  }

  const articleMeta = front.querySelector('article-meta')

  if (articleMeta) {
    // manuscript titles
    manuscript.title = htmlFromJatsNode(
      doc,
      articleMeta.querySelector('title-group > article-title')
    )

    manuscript.subtitle = htmlFromJatsNode(
      doc,
      articleMeta.querySelector('title-group > subtitle')
    )

    manuscript.runningTitle = htmlFromJatsNode(
      doc,
      articleMeta.querySelector(
        'title-group > alt-title[alt-title-type="right-running"]'
      )
    )

    // manuscript keywords
    const keywordGroupNode =
      articleMeta.querySelector(
        'article-meta > kwd-group[kwd-group-type="author"]'
      ) || articleMeta.querySelector('article-meta > kwd-group')

    if (keywordGroupNode) {
      manuscript.keywordIDs = []

      const keywordNodes = keywordGroupNode.querySelectorAll('kwd')

      let keywordPriority = 1

      for (const keywordNode of keywordNodes) {
        if (keywordNode.textContent) {
          const keyword = buildKeyword(keywordNode.textContent)
          keyword.priority = keywordPriority
          keywordPriority++

          addModel(keyword)

          manuscript.keywordIDs.push(keyword._id)
        }
      }
    }
  }

  addModel<Manuscript>(manuscript)

  // affiliations
  const affiliationIDs = new Map<string, string>()

  const affiliationNodes = front.querySelectorAll(
    'article-meta > contrib-group > aff'
  )

  affiliationNodes.forEach((affiliationNode, priority) => {
    const affiliation = buildAffiliation('', priority)

    for (const node of affiliationNode.querySelectorAll('institution')) {
      const content = node.textContent

      if (!content) {
        continue
      }

      const contentType = node.getAttribute('content-type')

      switch (contentType) {
        case null:
          affiliation.institution = content
          break

        case 'dept':
          affiliation.department = content
          break
      }
    }

    affiliation.addressLine1 =
      affiliationNode.querySelector('addr-line:nth-of-type(1)')?.textContent ||
      undefined
    affiliation.addressLine2 =
      affiliationNode.querySelector('addr-line:nth-of-type(2)')?.textContent ||
      undefined
    affiliation.addressLine3 =
      affiliationNode.querySelector('addr-line:nth-of-type(3)')?.textContent ||
      undefined

    // affiliation.postCode =
    //   affiliationNode.querySelector('postal-code')?.textContent || undefined
    // affiliation.city =
    //   affiliationNode.querySelector('city')?.textContent || undefined
    affiliation.country =
      affiliationNode.querySelector('country')?.textContent || undefined

    const id = affiliationNode.getAttribute('id')

    if (id) {
      affiliationIDs.set(id, affiliation._id)
    }

    addModel(affiliation)
  })

  // contributors

  // TODO: handle missing contrib-type?
  const authorNodes = front.querySelectorAll(
    'article-meta > contrib-group > contrib[contrib-type="author"]'
  )

  authorNodes.forEach((authorNode, priority) => {
    const name = buildBibliographicName({})

    const given = authorNode.querySelector('name > given-names')?.textContent

    if (given) {
      name.given = given
    }

    const surname = authorNode.querySelector('name > surname')?.textContent

    if (surname) {
      name.family = surname
    }

    const contributor = buildContributor(name, 'author', priority)

    const corresponding = authorNode.getAttribute('corresp') === 'yes'

    if (corresponding) {
      contributor.isCorresponding = corresponding
    }

    const orcid = authorNode.querySelector(
      'contrib-id[contrib-id-type="orcid"]'
    )?.textContent

    if (orcid) {
      contributor.ORCIDIdentifier = orcid
    }

    const xrefNode = authorNode.querySelector('xref[ref-type="aff"]')

    if (xrefNode) {
      const rid = xrefNode.getAttribute('rid')

      if (rid) {
        const rids = rid
          .split(/\s+/)
          .filter((id) => affiliationIDs.has(id))
          .map((id) => affiliationIDs.get(id)) as string[]

        if (rids.length) {
          contributor.affiliations = rids
        }
      }
    }

    addModel(contributor)
  })
}

const chooseContentType = (graphicNode?: Element): string | undefined => {
  if (graphicNode) {
    const mimetype = graphicNode.getAttribute('mimetype')
    const subtype = graphicNode.getAttribute('mime-subtype')

    if (mimetype && subtype) {
      return [mimetype, subtype].join('/')
    }

    const href = graphicNode.getAttributeNS(XLINK_NAMESPACE, 'href')

    if (href) {
      return mime.getType(href) || undefined
    }
  }
}

const chooseBibliographyItemType = (publicationType: string | null) => {
  switch (publicationType) {
    case 'book':
    case 'thesis':
      return publicationType

    case 'journal':
    default:
      return 'article-journal'
  }
}

const htmlFromJatsNode = (
  doc: Document,
  element: Element | null
): string | undefined => {
  if (element) {
    const template = doc.createElement('template')

    renameNodes(element, template, jatsToHtmlElementMap)

    return template.innerHTML
  }
}

export const parseJATSBack = (doc: Document, addModel: AddModel): void => {
  const back = doc.querySelector('back')

  if (!back) {
    return
  }

  // TODO: appendices (app-group/app)
  // TODO: notes (notes)

  // references

  const referenceIDs = new Map<string, string>()

  const referenceNodes = doc.querySelectorAll('ref-list > ref')

  referenceNodes.forEach((referenceNode) => {
    const publicationType = referenceNode.getAttribute('publication-type')

    const bibliographyItem = buildBibliographyItem({
      type: chooseBibliographyItemType(publicationType),
    })

    const titleNode = referenceNode.querySelector('article-title')

    if (titleNode) {
      bibliographyItem.title = htmlFromJatsNode(doc, titleNode)
    }

    const source = referenceNode.querySelector('source')?.textContent

    if (source) {
      bibliographyItem['container-title'] = source
    }

    const volume = referenceNode.querySelector('volume')?.textContent

    if (volume) {
      bibliographyItem.volume = volume
    }

    const fpage = referenceNode.querySelector('fpage')?.textContent
    const lpage = referenceNode.querySelector('lpage')?.textContent

    if (fpage) {
      bibliographyItem.page = lpage ? `${fpage}-${lpage}` : fpage
    }

    const year = referenceNode.querySelector('year')?.textContent

    if (year) {
      bibliographyItem.issued = buildBibliographicDate({
        'date-parts': [[year]],
      })
    }

    const doi = referenceNode.querySelector('pub-id[pub-id-type="doi"]')
      ?.textContent

    if (doi) {
      bibliographyItem.DOI = doi
    }

    const pmid = referenceNode.querySelector('pub-id[pub-id-type="pmid"]')
      ?.textContent

    if (pmid) {
      bibliographyItem.PMID = pmid
    }

    const pmcid = referenceNode.querySelector('pub-id[pub-id-type="pmcid"]')
      ?.textContent

    if (pmcid) {
      bibliographyItem.PMCID = pmcid
    }

    // TODO: handle missing person-group-type?
    // TODO: handle contrib-group nested inside collab
    // TODO: handle collab name
    const authorNodes = [
      ...referenceNode.querySelectorAll(
        'person-group[person-group-type="author"] > *'
      ),
    ]

    const authors: BibliographicName[] = []

    authorNodes.forEach((authorNode) => {
      const name = buildBibliographicName({})

      const given = authorNode.querySelector('given-names')?.textContent

      if (given) {
        name.given = given
      }

      const family = authorNode.querySelector('surname')?.textContent

      if (family) {
        name.family = family
      }

      const suffix = authorNode.querySelector('suffix')?.textContent

      if (suffix) {
        name.suffix = suffix
      }

      authors.push(name)
    })

    if (authors.length) {
      bibliographyItem.author = authors
    }

    // TODO: handle `etal`?

    addModel(bibliographyItem)

    const id = referenceNode.getAttribute('id')

    if (id) {
      referenceIDs.set(id, bibliographyItem._id)
    }
  })

  // cross-references

  const crossReferenceNodes = doc.querySelectorAll('body xref')

  crossReferenceNodes.forEach((crossReferenceNode) => {
    const rid = crossReferenceNode.getAttribute('rid')

    if (rid) {
      const refType = crossReferenceNode.getAttribute('ref-type')

      switch (refType) {
        case 'bibr':
          {
            const rids = rid
              .split(/\s+/)
              .filter((id) => referenceIDs.has(id))
              .map((id) => referenceIDs.get(id)) as string[]

            if (rids.length) {
              const citation = buildCitation('', rids) // TODO: closest id

              addModel(citation)

              crossReferenceNode.setAttribute('rid', citation._id)
            } else {
              crossReferenceNode.removeAttribute('rid')
            }
          }
          break

        case 'fn':
          // 1. Create a footnotes section if isnt created yet
          // 2. Create a footnote and populate with the content
          // const footnote = buildFootnote('footnote')
          // addModel(footnote)
          //doc.querySelectorAll(`fn[id=${rid}]`)
          break
        default:
          {
            const auxiliaryObjectReference = buildAuxiliaryObjectReference(
              '', // TODO: closest id
              rid // TODO: new figure id
            )

            addModel(auxiliaryObjectReference)

            crossReferenceNode.setAttribute('rid', auxiliaryObjectReference._id)
          }
          break
      }
    }
  })
}

const preprocessDocument = (doc: Document) => {
  // ensure that tables have a header and footer row
  for (const table of doc.querySelectorAll('table-wrap > table')) {
    const tbody = table.querySelector('tbody')

    if (tbody) {
      // if there are no table header rows, add an extra row to the start of the table body
      const headerRow = table.querySelector('thead > tr')

      if (!headerRow) {
        const tr = doc.createElement('tr')
        tbody.insertBefore(tr, tbody.firstElementChild)
      }

      // if there are no table footer rows, add an extra row to the end of the table body
      const footerRow = table.querySelector('tfoot > tr')

      if (!footerRow) {
        const tr = doc.createElement('tr')
        tbody.appendChild(tr)
      }
    }
  }
}

export const parseJATSArticle = async (doc: Document): Promise<Model[]> => {
  const modelMap = new Map<string, Model>()
  const addModel = addModelToMap(modelMap)

  await parseJATSFront(doc, addModel)
  parseJATSBack(doc, addModel)

  preprocessDocument(doc)
  const node = parseJATSBody(doc, modelMap)

  if (!node.firstChild) {
    throw new Error('No content was parsed from the article body')
  }

  const bodyMap = encode(node.firstChild)

  // TODO: use ISSN from journal-meta to choose a template

  return [...modelMap.values(), ...bodyMap.values()]
}
