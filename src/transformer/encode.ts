/*!
 * © 2019 Atypon Systems LLC
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
  Affiliation,
  BibliographyElement,
  BibliographyItem,
  CommentAnnotation,
  Contributor,
  ElementsOrder,
  Equation,
  EquationElement,
  Figure,
  FigureElement,
  Footnote,
  FootnotesElement,
  FootnotesOrder,
  InlineMathFragment,
  Keyword,
  KeywordGroup,
  KeywordsElement,
  ListElement,
  Listing,
  ListingElement,
  MissingFigure,
  Model,
  ParagraphElement,
  QuoteElement,
  Section,
  Supplement,
  Table,
  TableElement,
  TableElementFooter,
  Titles,
  TOCElement,
} from '@manuscripts/json-schema'
import { DOMSerializer } from 'prosemirror-model'
import serializeToXML from 'w3c-xmlserializer'

import { iterateChildren } from '../lib/utils'
import {
  hasGroup,
  isHighlightMarkerNode,
  isManuscriptNode,
  isSectionNode,
  ManuscriptNode,
  ManuscriptNodeType,
  Nodes,
  schema,
  TableElementNode,
} from '../schema'
import {
  AuxiliaryObjects,
  auxiliaryObjectTypes,
  buildAttribution,
  buildElementsOrder,
  buildFootnotesOrder,
} from './builders'
import { FootnotesOrderIndexList } from './footnotes-order'
import { CommentMarker, extractCommentMarkers } from './highlight-markers'
import { PlaceholderElement } from './models'
import { nodeTypesMap } from './node-types'
import { buildSectionCategory } from './section-category'

const serializer = DOMSerializer.fromSchema(schema)

const contents = (node: ManuscriptNode): string => {
  const output = serializer.serializeNode(node) as HTMLElement
  return serializeToXML(output)
}

const footnoteContents = (node: ManuscriptNode): string => {
  const output = serializer.serializeNode(node) as HTMLElement
  output.querySelectorAll('p').forEach((element) => {
    element.removeAttribute('class')
    element.removeAttribute('data-object-type')
  })
  return serializeToXML(output)
}

const keywordContents = (node: ManuscriptNode): string => {
  const text = (serializer.serializeNode(node) as HTMLElement).textContent

  return text === null ? '' : text
}

export const inlineContents = (node: ManuscriptNode): string =>
  (serializer.serializeNode(node) as HTMLElement).innerHTML

export const inlineText = (node: ManuscriptNode): string => {
  const text = (serializer.serializeNode(node) as HTMLElement).textContent

  return text === null ? '' : text
}

const listContents = (node: ManuscriptNode): string => {
  const output = serializer.serializeNode(node) as HTMLElement

  for (const p of output.querySelectorAll('li > p')) {
    const parent = p.parentNode as HTMLLIElement

    while (p.firstChild) {
      parent.insertBefore(p.firstChild, p)
    }

    parent.removeChild(p)
  }

  return serializeToXML(output)
}

const svgDefs = (svg: string): string | undefined => {
  const template = document.createElement('template')
  template.innerHTML = svg.trim()

  const defs = template.content.querySelector('defs')

  return defs ? serializeToXML(defs) : undefined
}

const tableRowDisplayStyle = (tagName: string, parent: ManuscriptNode) => {
  switch (tagName) {
    case 'thead':
      return parent.attrs.suppressHeader ? 'none' : 'table-header-group'

    case 'tfoot':
      return parent.attrs.suppressFooter ? 'none' : 'table-footer-group'

    default:
      return null
  }
}

const buildTableSection = (
  tagName: string,
  inputRows: HTMLTableRowElement[],
  parent: ManuscriptNode
): HTMLTableSectionElement => {
  const section = document.createElement(tagName) as HTMLTableSectionElement

  for (const sectionRow of inputRows) {
    const row = section.appendChild(document.createElement('tr'))

    for (const child of sectionRow.children) {
      const cellType = tagName === 'thead' ? 'th' : 'td'

      const cell = row.appendChild(document.createElement(cellType))

      while (child.firstChild) {
        cell.appendChild(child.firstChild)
      }

      for (const attribute of child.attributes) {
        cell.setAttribute(attribute.name, attribute.value)
      }
    }
  }

  const displayStyle = tableRowDisplayStyle(tagName, parent)

  if (displayStyle) {
    section.style.display = displayStyle
  }

  return section
}

function buildTableColGroup(cols: HTMLTableColElement[]) {
  if (cols.length === 0) {
    return undefined
  }
  const colgroup = document.createElement('colgroup')
  for (const inputCol of cols) {
    const col = document.createElement('col')
    for (const attribute of inputCol.attributes) {
      col.setAttribute(attribute.name, attribute.value)
    }
    colgroup.appendChild(inputCol)
  }
  return colgroup
}

const tableContents = (
  node: ManuscriptNode,
  parent: TableElementNode
): string => {
  const input = serializer.serializeNode(node) as HTMLTableElement

  const output = document.createElement('table')

  const colgroup = buildTableColGroup(Array.from(input.querySelectorAll('col')))
  if (colgroup) {
    output.appendChild(colgroup)
  }

  output.setAttribute('id', parent.attrs.id)

  output.classList.add('MPElement')

  if (parent.attrs.tableStyle) {
    output.classList.add(parent.attrs.tableStyle.replace(/:/g, '_'))
  }

  if (parent.attrs.paragraphStyle) {
    output.classList.add(parent.attrs.paragraphStyle.replace(/:/g, '_'))
  }

  output.setAttribute('data-contained-object-id', node.attrs.id)

  const rows = Array.from(input.querySelectorAll('tr'))

  // there may be more that one header rows
  // we assume that <th scope="col | colgroup"> always belong to <thead>
  let headerCount = 0
  for (const row of rows) {
    const th = row.querySelector('th[scope="col"], th[scope="colgroup"]')
    th && headerCount++
  }

  const thead = rows.splice(0, headerCount || 1)
  const tfoot = rows.splice(-1, 1)

  output.appendChild(buildTableSection('thead', thead, parent))
  output.appendChild(buildTableSection('tbody', rows, parent))
  output.appendChild(buildTableSection('tfoot', tfoot, parent))

  return serializeToXML(output)
}

const elementContents = (node: ManuscriptNode): string => {
  const input = serializer.serializeNode(node) as HTMLDivElement

  input.classList.add('MPElement')

  if (node.attrs.paragraphStyle) {
    input.classList.add(node.attrs.paragraphStyle.replace(/:/g, '_'))
  }

  if (node.attrs.id) {
    input.setAttribute('id', node.attrs.id)
  }

  return serializeToXML(input)
}

const childElements = (node: ManuscriptNode): ManuscriptNode[] => {
  const nodes: ManuscriptNode[] = []

  node.forEach((childNode) => {
    if (!isSectionNode(childNode)) {
      nodes.push(childNode)
    }
  })

  return nodes
}
const sectionChildElementIds = (node: ManuscriptNode): string[] | undefined => {
  const nodes: ManuscriptNode[] = []

  node.forEach((childNode) => {
    if (!hasGroup(childNode.type, 'sections')) {
      nodes.push(childNode)
    }
  })

  return nodes.map((childNode) => childNode.attrs.id).filter((id) => id)
}

const attributeOfNodeType = (
  node: ManuscriptNode,
  type: string,
  attribute: string
): string => {
  for (const child of iterateChildren(node)) {
    if (child.type.name === type) {
      return child.attrs[attribute]
    }
  }

  return ''
}

const inlineContentsOfNodeType = (
  node: ManuscriptNode,
  nodeType: ManuscriptNodeType
): string => {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)

    if (child.type === nodeType) {
      return inlineContents(child)
    }
  }

  return ''
}

const inlineContentOfChildNodeType = (
  node: ManuscriptNode,
  parentNodeType: ManuscriptNodeType,
  childNodeType: ManuscriptNodeType,
  empty = true
): string | undefined => {
  const parentNode = childElements(node).find(
    (node) => node.type === parentNodeType && node
  )

  const content =
    parentNode && inlineContentsOfNodeType(parentNode, childNodeType)

  // TODO:: this is a workaround, until we update test data in manuscripts-examples
  return content && content.length > 1 ? content : empty ? content : undefined
}

const wrappedContentOfChildrenNodeType = (
  node: ManuscriptNode,
  parentNodeType: ManuscriptNodeType,
  childNodeType: ManuscriptNodeType
): string | undefined => {
  const parentNode = childElements(node).find(
    (node) => node.type === parentNodeType && node
  )

  const content =
    parentNode &&
    childElements(parentNode)
      .filter((node) => node.type === childNodeType && node)
      .map((node) => (serializer.serializeNode(node) as HTMLElement).outerHTML)
      .join('')

  return content
}

const containedFigureIDs = (node: ManuscriptNode): string[] => {
  const figureNodeType = node.type.schema.nodes.figure
  const missingFigureNodeType = node.type.schema.nodes.missing_figure
  return containedObjectIDs(node, [figureNodeType, missingFigureNodeType])
}

const containedParagraphIDs = (node: ManuscriptNode): string[] => {
  const paragraphNodeType = node.type.schema.nodes.paragraph
  return containedObjectIDs(node, [paragraphNodeType])
}

const containedBibliographyItemIDs = (node: ManuscriptNode): string[] => {
  const bibliographyItemNodeType = node.type.schema.nodes.bibliography_item
  return containedObjectIDs(node, [bibliographyItemNodeType])
}
const containedObjectIDs = (
  node: ManuscriptNode,
  nodeTypes?: ManuscriptNodeType[]
): string[] => {
  const ids: string[] = []

  for (let i = 0; i < node.childCount; i++) {
    const childNode = node.child(i)
    if (!nodeTypes || nodeTypes.includes(childNode.type)) {
      ids.push(childNode.attrs.id)
    }
  }

  return ids
}

const attribution = (node: ManuscriptNode) => {
  if (node.attrs.attribution) {
    return {
      ...node.attrs.attribution,
      ...buildAttribution(),
    }
  }
  return undefined
}

const fromJson = (json: string) => {
  let obj

  try {
    obj = JSON.parse(json)
  } catch (e) {
    //pass
  }

  return obj
}

function figureElementEncoder<T>(node: ManuscriptNode) {
  // eslint-disable-next-line prettier/prettier
  return {
    containedObjectIDs: containedParagraphIDs(node)?.concat(
      containedFigureIDs(node)
    ),
    caption: wrappedContentOfChildrenNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption
    ),
    title: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption_title,
      false
    ),
    label: node.attrs.label,
    elementType: 'figure',
    attribution: attribution(node),
    alternatives: node.attrs.alternatives,
    listingID: attributeOfNodeType(node, 'listing', 'id') || undefined,
    alignment: node.attrs.alignment || undefined,
    sizeFraction: node.attrs.sizeFraction || undefined,
    suppressCaption: Boolean(node.attrs.suppressCaption) || undefined,
    suppressTitle:
      node.attrs.suppressTitle === undefined ||
      node.attrs.suppressTitle === true
        ? undefined
        : false,
    figureStyle: node.attrs.figureStyle || undefined,
    figureLayout: node.attrs.figureLayout || undefined,
    // eslint-disable-next-line prettier/prettier
  } as unknown as Partial<T>
}

type NodeEncoder = (
  node: ManuscriptNode,
  parent: ManuscriptNode,
  path: string[],
  priority: PrioritizedValue
) => Partial<Model>

type NodeEncoderMap = { [key in Nodes]?: NodeEncoder }

const encoders: NodeEncoderMap = {
  title: (node): Partial<Titles> => ({
    title: inlineContents(node),
    subtitle: node.attrs.subtitle,
    runningTitle: node.attrs.runningTitle,
    _id: node.attrs._id,
  }),
  bibliography_element: (node): Partial<BibliographyElement> => ({
    elementType: 'div',
    contents: '',
    containedObjectIDs: containedBibliographyItemIDs(node),
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  bibliography_item: (node): Partial<BibliographyItem> => {
    const {
      type,
      containerTitle,
      doi,
      volume,
      issue,
      supplement,
      page,
      title,
      literal,
    } = node.attrs

    const getObjectAtrr = (obj: string | object) =>
      typeof obj === 'string' ? fromJson(obj) : obj
    const author = getObjectAtrr(node.attrs.author)
    const issued = getObjectAtrr(node.attrs.issued)

    const ref = {
      type,
    } as Partial<BibliographyItem>

    if (author) {
      ref.author = author
    }

    if (issued) {
      ref.issued = issued
    }

    if (containerTitle) {
      ref['container-title'] = containerTitle
    }

    if (doi) {
      ref.DOI = doi
    }

    if (volume) {
      ref.volume = volume
    }

    if (issue) {
      ref.issue = issue
    }

    if (supplement) {
      ref.supplement = supplement
    }

    if (page) {
      ref.page = page
    }

    if (title) {
      ref.title = title
    }

    if (literal) {
      ref.literal = literal
    }

    return ref
  },
  bibliography_section: (node, parent, path, priority): Partial<Section> => ({
    category: buildSectionCategory(node),
    priority: priority.value++,
    title: inlineContentsOfNodeType(node, node.type.schema.nodes.section_title),
    path: path.concat([node.attrs.id]),
    elementIDs: childElements(node)
      .map((childNode) => childNode.attrs.id)
      .filter((id) => id),
  }),
  blockquote_element: (node): Partial<QuoteElement> => ({
    contents: contents(node),
    elementType: 'div',
    paragraphStyle: node.attrs.paragraphStyle || undefined,
    placeholderInnerHTML: node.attrs.placeholder || '',
    quoteType: 'block',
  }),
  bullet_list: (node): Partial<ListElement> => ({
    elementType: 'ul',
    contents: listContents(node),
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  listing: (node): Partial<Listing> => ({
    contents: inlineText(node),
    language: node.attrs.language || undefined,
    languageKey: node.attrs.languageKey || 'null', // TODO: remove this?
  }),
  listing_element: (node): Partial<ListingElement> => ({
    containedObjectID: attributeOfNodeType(node, 'listing', 'id'),
    caption: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption
    ),
    title: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption_title,
      false
    ),
    elementType: 'figure',
    suppressCaption: node.attrs.suppressCaption === true ? undefined : false,
    suppressTitle:
      node.attrs.suppressTitle === undefined ||
      node.attrs.suppressTitle === true
        ? undefined
        : false,
  }),
  equation: (node): Partial<Equation> => ({
    MathMLStringRepresentation:
      node.attrs.MathMLStringRepresentation || undefined,
    TeXRepresentation: node.attrs.TeXRepresentation,
    SVGStringRepresentation: node.attrs.SVGStringRepresentation,
    // title: 'Equation',
  }),
  equation_element: (node): Partial<EquationElement> => ({
    containedObjectID: attributeOfNodeType(node, 'equation', 'id'),
    caption: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption
    ),
    title: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption_title,
      false
    ),
    elementType: 'p',
    suppressCaption: Boolean(node.attrs.suppressCaption) || undefined,
    suppressTitle:
      node.attrs.suppressTitle === undefined ||
      node.attrs.suppressTitle === true
        ? undefined
        : false,
  }),
  figure: (node): Partial<Figure> => ({
    contentType: node.attrs.contentType || undefined,
    src: node.attrs.src || undefined,
    position: node.attrs.position || undefined,
  }),
  figure_element: (node): Partial<FigureElement> =>
    figureElementEncoder<FigureElement>(node),
  comment: (node): Partial<CommentAnnotation> => ({
    selector: node.attrs.selector,
    target: node.attrs.target,
    contents: node.attrs.contents,
    resolved: node.attrs.resolved,
    contributions: node.attrs.contributions,
    originalText: node.attrs.originalText,
  }),
  footnote: (node, parent): Partial<Footnote> => ({
    containingObject: parent.attrs.id,
    contents: footnoteContents(node), // TODO: needed?
    kind: node.attrs.kind || 'footnote',
  }),
  footnotes_element: (node): Partial<FootnotesElement> => ({
    contents: '<div></div>', // contents(node), // TODO: empty div instead?
    elementType: 'div',
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  table_element_footer: (node): Partial<TableElementFooter> => ({
    containedObjectIDs: containedObjectIDs(node),
  }),
  footnotes_section: (node, parent, path, priority): Partial<Section> => ({
    category: buildSectionCategory(node),
    priority: priority.value++,
    title: inlineContentsOfNodeType(node, node.type.schema.nodes.section_title),
    path: path.concat([node.attrs.id]),
    elementIDs: childElements(node)
      .map((childNode) => childNode.attrs.id)
      .filter((id) => id),
  }),
  graphical_abstract_section: (
    node,
    parent,
    path,
    priority
  ): Partial<Section> => ({
    category: buildSectionCategory(node),
    priority: priority.value++,
    title: inlineContentsOfNodeType(node, node.type.schema.nodes.section_title),
    path: path.concat([node.attrs.id]),
    elementIDs: childElements(node)
      .map((childNode) => childNode.attrs.id)
      .filter((id) => id),
  }),
  inline_equation: (node, parent): Partial<InlineMathFragment> => ({
    containingObject: parent.attrs.id,
    // MathMLRepresentation: node.attrs.MathMLRepresentation || undefined,
    TeXRepresentation: node.attrs.TeXRepresentation,
    SVGRepresentation: node.attrs.SVGRepresentation,
    SVGGlyphs: svgDefs(node.attrs.SVGRepresentation),
  }),
  keyword: (node, parent): Partial<Keyword> => ({
    containedGroup: parent.attrs.id,
    name: keywordContents(node),
  }),
  keywords_element: (node): Partial<KeywordsElement> => ({
    contents: '<div></div>',
    elementType: 'div',
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  keyword_group: (node): Partial<KeywordGroup> => ({
    type: node.attrs.type,
  }),
  missing_figure: (node): Partial<MissingFigure> => ({
    position: node.attrs.position || undefined,
  }),
  ordered_list: (node): Partial<ListElement> => ({
    elementType: 'ol',
    contents: listContents(node),
    listStyleType: node.attrs.listStyleType,
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  paragraph: (node): Partial<ParagraphElement> => ({
    elementType: 'p',
    contents: contents(node), // TODO: can't serialize citations?
    paragraphStyle: node.attrs.paragraphStyle || undefined,
    placeholderInnerHTML: node.attrs.placeholder || '',
  }),
  placeholder_element: (): Partial<PlaceholderElement> => ({
    elementType: 'p',
  }),
  pullquote_element: (node): Partial<QuoteElement> => ({
    contents: contents(node),
    elementType: 'div',
    paragraphStyle: node.attrs.paragraphStyle || undefined,
    placeholderInnerHTML: node.attrs.placeholder || '',
    quoteType: 'pull',
  }),
  section: (node, parent, path, priority): Partial<Section> => ({
    category: buildSectionCategory(node),
    priority: priority.value++,
    title: inlineContentsOfNodeType(node, node.type.schema.nodes.section_title),
    label:
      inlineContentsOfNodeType(node, node.type.schema.nodes.section_label) ||
      undefined,
    path: path.concat([node.attrs.id]),
    elementIDs: sectionChildElementIds(node),
    titleSuppressed: node.attrs.titleSuppressed || undefined,
    generatedLabel: node.attrs.generatedLabel || undefined,
    pageBreakStyle: node.attrs.pageBreakStyle || undefined,
  }),
  table: (node, parent): Partial<Table> => ({
    contents: tableContents(node, parent as TableElementNode),
    listingAttachment: node.attrs.listingAttachment || undefined,
  }),
  table_element: (node): Partial<TableElement> => ({
    containedObjectID: attributeOfNodeType(node, 'table', 'id'),
    tableElementFooterID:
      attributeOfNodeType(node, 'table_element_footer', 'id') || undefined,
    caption: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption
    ),
    title: inlineContentOfChildNodeType(
      node,
      node.type.schema.nodes.figcaption,
      node.type.schema.nodes.caption_title,
      false
    ),
    // TODO is defined as 'figure' HTML element in schema but is more or less a wrapper eg a div
    elementType: 'table',
    listingID: attributeOfNodeType(node, 'listing', 'id') || undefined,
    paragraphStyle: node.attrs.paragraphStyle || undefined,
    suppressCaption: Boolean(node.attrs.suppressCaption) || undefined,
    suppressTitle:
      node.attrs.suppressTitle === undefined ||
      node.attrs.suppressTitle === true
        ? undefined
        : false,
    suppressFooter: Boolean(node.attrs.suppressFooter) || undefined,
    suppressHeader: Boolean(node.attrs.suppressHeader) || undefined,
    tableStyle: node.attrs.tableStyle || undefined,
  }),
  toc_element: (node): Partial<TOCElement> => ({
    contents: elementContents(node),
    elementType: 'div',
    paragraphStyle: node.attrs.paragraphStyle || undefined,
  }),
  toc_section: (node, parent, path, priority): Partial<Section> => ({
    category: buildSectionCategory(node),
    priority: priority.value++,
    title: inlineContentsOfNodeType(node, node.type.schema.nodes.section_title),
    path: path.concat([node.attrs.id]),
    elementIDs: childElements(node)
      .map((childNode) => childNode.attrs.id)
      .filter((id) => id),
  }),

  affiliation: (node): Partial<Affiliation> => ({
    institution: node.attrs.institution,
    addressLine1: node.attrs.addressLine1,
    addressLine2: node.attrs.addressLine2,
    addressLine3: node.attrs.addressLine3,
    department: node.attrs.department,
    postCode: node.attrs.postCode,
    country: node.attrs.country,
    county: node.attrs.county,
    city: node.attrs.city,
    email: node.attrs.email,
    priority: node.attrs.priority,
  }),
  contributor: (node): Partial<Contributor> => ({
    role: node.attrs.role,
    affiliations: node.attrs.affiliations,
    bibliographicName: node.attrs.bibliographicName,
    userID: node.attrs.userID,
    invitationID: node.attrs.invitationID,
    isCorresponding: node.attrs.isCorresponding,
    isJointContributor: node.attrs.isJointContributor,
    ORCIDIdentifier: node.attrs.ORCIDIdentifier,
    footnote: node.attrs.footnote,
    corresp: node.attrs.corresp,
    priority: node.attrs.priority,
  }),
  supplement: (node): Partial<Supplement> => ({
    href: node.attrs.href,
    title: node.attrs.title,
    MIME:
      node.attrs.mimeType && node.attrs.mimeSubType
        ? [node.attrs.mimeType, node.attrs.mimeSubType].join('/')
        : '',
  }),
}

const modelData = (
  node: ManuscriptNode,
  parent: ManuscriptNode,
  path: string[],
  priority: PrioritizedValue
): Partial<Model> => {
  const encoder = encoders[node.type.name as Nodes]

  if (!encoder) {
    throw new Error(`Unhandled model: ${node.type.name}`)
  }

  return encoder(node, parent, path, priority)
}

export const modelFromNode = (
  node: ManuscriptNode,
  parent: ManuscriptNode,
  path: string[],
  priority: PrioritizedValue
): {
  model: Model
  markers: CommentMarker[]
} => {
  // TODO: in handlePaste, filter out non-standard IDs

  const objectType = nodeTypesMap.get(node.type)

  if (!objectType) {
    throw new Error(`No objectType is defined for ${node.type.name}`)
  }

  const { id } = node.attrs

  if (!id) {
    throw new Error(`No id is defined for this ${node.type.name}`)
  }

  const data = {
    ...modelData(node, parent, path, priority),
    _id: id,
    objectType: objectType,
  }

  const model = data as Model
  const markers = extractCommentMarkers(model)

  return { model, markers }
}

interface PrioritizedValue {
  value: number
}

const containerTypes = [
  schema.nodes.affiliations,
  schema.nodes.contributors,
  schema.nodes.affiliations,
  schema.nodes.keywords,
  schema.nodes.supplements,
  schema.nodes.abstracts,
  schema.nodes.body,
  schema.nodes.backmatter,
]

const placeholderTypes = [
  schema.nodes.placeholder,
  schema.nodes.placeholder_element,
]

export const encode = (node: ManuscriptNode): Map<string, Model> => {
  const models: Map<string, Model> = new Map()

  const priority: PrioritizedValue = {
    value: 1,
  }

  const processNode =
    (path: string[], parent: ManuscriptNode) => (child: ManuscriptNode) => {
      if (containerTypes.includes(child.type)) {
        child.forEach(processNode([], child))
        return
      }
      if (!child.attrs.id) {
        return
      }
      if (isHighlightMarkerNode(child)) {
        return
      }
      if (placeholderTypes.includes(child.type)) {
        return
      }
      if (
        parent.type === schema.nodes.paragraph &&
        child.type !== schema.nodes.inline_equation
      ) {
        return
      }

      if (child.type === schema.nodes.footnotes_element) {
        addFootnotesOrderModel(child, models)
      }

      const { model, markers } = modelFromNode(child, parent, path, priority)

      markers.forEach((marker) => {
        const comment = models.get(marker._id) as CommentAnnotation
        if (comment) {
          comment.selector = {
            from: marker.from,
            to: marker.to,
          }
        }
      })
      if (models.has(model._id)) {
        throw Error(`Duplicate ids in encode: ${model._id}`)
      }
      models.set(model._id, model)
      child.forEach(processNode(path.concat(child.attrs.id), child))
    }
  // Comments must be processed before the actual content
  const comments = node.lastChild as ManuscriptNode
  if (comments && comments.type === schema.nodes.comments) {
    comments.forEach(processNode([], comments))
  }
  node.forEach(processNode([], node))
  if (isManuscriptNode(node)) {
    auxiliaryObjectTypes.forEach((t) => {
      const order = generateElementOrder(node, t)
      if (order) {
        models.set(order._id, order as Model)
      }
    })
  }
  return models
}

const generateElementOrder = (
  node: ManuscriptNode,
  nodeType: ManuscriptNodeType
): ElementsOrder | undefined => {
  const ids: string[] = []
  node.descendants((n) => {
    if (n.type === nodeType) {
      ids.push(n.attrs.id)
    }
    return true
  })
  if (!ids.length) {
    return undefined
  }
  const type = nodeTypesMap.get(nodeType)
  if (!type) {
    return undefined
  }
  const order = buildElementsOrder(type as AuxiliaryObjects)
  order.elements = ids
  return order as ElementsOrder
}

const addFootnotesOrderModel = (
  child: ManuscriptNode,
  models: Map<string, Model>
) => {
  const footnoteList: FootnotesOrderIndexList = []
  child.forEach((footnote, _, index) =>
    footnoteList.push({ id: footnote.attrs.id, index })
  )

  const footnotesOrder = buildFootnotesOrder(footnoteList, child.attrs.id)
  models.set(footnotesOrder._id, footnotesOrder as FootnotesOrder)
}
