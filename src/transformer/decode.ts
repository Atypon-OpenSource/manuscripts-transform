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
  Element,
  Equation,
  EquationElement,
  Figure,
  FigureElement,
  Footnote,
  FootnotesElement,
  FootnotesElementWrapper,
  Keyword,
  KeywordGroup,
  KeywordsElement,
  ListElement,
  Listing,
  ListingElement,
  MissingFigure,
  Model,
  ObjectTypes,
  ParagraphElement,
  QuoteElement,
  Section,
  Table,
  TableElement,
  TOCElement,
} from '@manuscripts/json-schema'
import debug from 'debug'
import { DOMParser, Node, ParseOptions } from 'prosemirror-model'

import { MissingElement } from '../errors'
import {
  AffiliationListNode,
  AffiliationNode,
  BibliographyElementNode,
  BibliographyItemNode,
  BlockquoteElementNode,
  BulletListNode,
  CaptionNode,
  CaptionTitleNode,
  CommentNode,
  ContributorListNode,
  ContributorNode,
  EquationElementNode,
  EquationNode,
  FigCaptionNode,
  FigureElementNode,
  FigureNode,
  FootnoteNode,
  FootnotesElementNode,
  FootnotesElementWrapperNode,
  KeywordNode,
  KeywordsElementNode,
  ListingElementNode,
  ListingNode,
  ManuscriptNode,
  MissingFigureNode,
  OrderedListNode,
  ParagraphNode,
  PlaceholderElementNode,
  PlaceholderNode,
  PullquoteElementNode,
  schema,
  SectionNode,
  SectionTitleNode,
  TableElementNode,
  TableNode,
  TOCElementNode,
} from '../schema'
import { CommentListNode } from '../schema/nodes/comment_list'
import { KeywordsGroupNode } from '../schema/nodes/keywords_group'
import { MetaSectionNode } from '../schema/nodes/meta_section'
import { insertHighlightMarkers } from './highlight-markers'
import { generateNodeID } from './id'
import { PlaceholderElement } from './models'
import {
  ExtraObjectTypes,
  hasObjectType,
  isCommentAnnotation,
  isManuscript,
} from './object-types'
import {
  chooseSectionLableName,
  chooseSectionNodeType,
  chooseSecType,
  guessSectionCategory,
  SectionCategory,
} from './section-category'
import { timestamp } from './timestamp'

const warn = debug('manuscripts-transform')

const parser = DOMParser.fromSchema(schema)

interface NodeCreatorMap {
  [key: string]: (data: Model) => ManuscriptNode
}

export const getModelData = <T extends Model>(model: Model): T => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, createdAt, ...data } = model

  return data as T
}

export const getModelsByType = <T extends Model>(
  modelMap: Map<string, Model>,
  objectType: string
): T[] => {
  const output: T[] = []

  for (const model of modelMap.values()) {
    if (model.objectType === objectType) {
      output.push(model as T)
    }
  }

  return output
}

export const sortSectionsByPriority = (a: Section, b: Section): number =>
  a.priority === b.priority ? 0 : Number(a.priority) - Number(b.priority)

// TODO: include bibliography and toc sections
const getSections = (modelMap: Map<string, Model>) =>
  getModelsByType<Section>(modelMap, ObjectTypes.Section).sort(
    sortSectionsByPriority
  )
const getAffiliations = (modelMap: Map<string, Model>) =>
  getModelsByType<Affiliation>(modelMap, ObjectTypes.Affiliation)
const getContributors = (modelMap: Map<string, Model>) =>
  getModelsByType<Affiliation>(modelMap, ObjectTypes.Contributor)

export const isManuscriptNode = (
  model: ManuscriptNode | null
): model is ManuscriptNode => model !== null

const isParagraphElement = hasObjectType<ParagraphElement>(
  ObjectTypes.ParagraphElement
)

const isFootnote = hasObjectType<Footnote>(ObjectTypes.Footnote)

const isKeyword = hasObjectType<Keyword>(ObjectTypes.Keyword)

const hasParentSection = (id: string) => (section: Section) =>
  section.path &&
  section.path.length > 1 &&
  section.path[section.path.length - 2] === id

export class Decoder {
  private readonly modelMap: Map<string, Model>
  private readonly allowMissingElements: boolean
  private comments: Map<string, ManuscriptNode> = new Map<
    string,
    ManuscriptNode
  >()

  private creators: NodeCreatorMap = {
    [ObjectTypes.BibliographyElement]: (data) => {
      const model = data as BibliographyElement

      const referenceIDs = model.containedObjectIDs?.filter((i) =>
        i.startsWith('MPBibliographyItem')
      )

      const references: Array<BibliographyItemNode | PlaceholderNode> = []
      referenceIDs?.forEach((id) => {
        const referenceModel = this.getModel<BibliographyItem>(id)
        if (referenceModel) {
          return references.push(
            this.decode(referenceModel) as BibliographyItemNode
          )
        }
      })

      if (!references.length) {
        references.push(
          schema.nodes.placeholder.createAndFill() as PlaceholderNode
        )
      }

      return schema.nodes.bibliography_element.createChecked(
        {
          id: model._id,
          contents: '',
          paragraphStyle: model.paragraphStyle,
        },
        references
      ) as BibliographyElementNode
    },
    [ObjectTypes.BibliographyItem]: (data) => {
      const model = data as BibliographyItem

      return schema.nodes.bibliography_item.create({
        id: model._id,
        type: model.type,
        author: model.author,
        issued: model.issued,
        containerTitle: model['container-title'],
        volume: model.volume,
        issue: model.issue,
        supplement: model.supplement,
        doi: model.DOI,
        page: model.page,
        title: model.title,
        literal: model.literal,
      }) as BibliographyItemNode
    },
    [ExtraObjectTypes.PlaceholderElement]: (data) => {
      const model = data as PlaceholderElement

      return schema.nodes.placeholder_element.create({
        id: model._id,
      }) as PlaceholderElementNode
    },
    [ObjectTypes.Figure]: (data) => {
      const model = data as Figure

      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.figure.create({
        id: model._id,
        contentType: model.contentType,
        src: model.src,
        position: model.position,
        comments: commentNodes.map((c) => c.attrs.id),
      })
    },
    [ObjectTypes.FigureElement]: (data) => {
      const model = data as FigureElement

      const paragraphIDs = model.containedObjectIDs.filter((i) =>
        i.startsWith('MPParagraphElement')
      )
      const figureIDs = model.containedObjectIDs.filter(
        (i) => i.startsWith('MPFigure') || i.startsWith('MPMissingFigure')
      )

      const paragraphs: Array<ParagraphNode> = []
      paragraphIDs.forEach((id) => {
        const paragraphModel = this.getModel<ParagraphElement>(id)
        if (paragraphModel) {
          return paragraphs.push(this.decode(paragraphModel) as ParagraphNode)
        }
      })

      const figures: Array<FigureNode | MissingFigureNode | PlaceholderNode> =
        []
      figureIDs.forEach((id) => {
        const figureModel = this.getModel<Figure | MissingFigure>(id)
        if (!figureModel) {
          return figures.push(
            schema.nodes.placeholder.create({
              id,
              label: 'A figure',
            }) as PlaceholderNode
          )
        }

        return figures.push(
          this.decode(figureModel) as FigureNode | MissingFigureNode
        )
      })

      if (!figures.length) {
        figures.push(schema.nodes.figure.createAndFill() as FigureNode)
      }

      const figcaption: FigCaptionNode = this.getFigcaption(model)

      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      const content: ManuscriptNode[] = [...paragraphs, ...figures, figcaption]
      const listing = this.extractListing(model)
      if (listing) {
        content.push(listing)
      } else {
        const listing = schema.nodes.listing.create()
        content.push(listing)
      }

      return schema.nodes.figure_element.createChecked(
        {
          id: model._id,
          figureLayout: model.figureLayout,
          label: model.label,
          figureStyle: model.figureStyle,
          alignment: model.alignment,
          sizeFraction: model.sizeFraction,
          suppressCaption: Boolean(model.suppressCaption),
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
          attribution: model.attribution,
          alternatives: model.alternatives,
          comments: commentNodes.map((c) => c.attrs.id),
        },
        content
      ) as FigureElementNode
    },
    [ObjectTypes.Equation]: (data) => {
      const model = data as Equation

      return schema.nodes.equation.createChecked({
        id: model._id,
        MathMLStringRepresentation: model.MathMLStringRepresentation,
        SVGStringRepresentation: model.SVGStringRepresentation,
        TeXRepresentation: model.TeXRepresentation,
      }) as EquationNode
    },
    [ObjectTypes.EquationElement]: (data) => {
      const model = data as EquationElement

      const equationModel = this.getModel<Equation>(model.containedObjectID)
      let equation: EquationNode | PlaceholderNode

      if (equationModel) {
        equation = this.decode(equationModel) as EquationNode
      } else if (this.allowMissingElements) {
        equation = schema.nodes.placeholder.create({
          id: model.containedObjectID,
          label: 'An equation',
        }) as PlaceholderNode
      } else {
        throw new MissingElement(model.containedObjectID)
      }

      const figcaption: FigCaptionNode = this.getFigcaption(model)

      return schema.nodes.equation_element.createChecked(
        {
          id: model._id,
          suppressCaption: Boolean(model.suppressCaption),
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
        },
        [equation, figcaption]
      ) as EquationElementNode
    },
    [ObjectTypes.FootnotesElement]: (data) => {
      const foonotesElementModel = data as FootnotesElement

      const collateByKind = foonotesElementModel.collateByKind || 'footnote'
      const footnotesOfKind = []
      for (const model of this.modelMap.values()) {
        if (
          isFootnote(model) &&
          model.kind === collateByKind &&
          (model.containingObject === undefined ||
            model.containingObject === foonotesElementModel._id)
        ) {
          const commentNodes = this.createCommentsNode(model)
          commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
          const footnote = this.parseContents(
            model.contents || '<div></div>',
            undefined,
            this.getComments(model),
            {
              topNode: schema.nodes.footnote.create({
                id: model._id,
                kind: model.kind,
                comments: commentNodes.map((c) => c.attrs.id),
                // placeholder: model.placeholderText
                // paragraphStyle: model.paragraphStyle,
              }),
            }
          ) as FootnoteNode

          footnotesOfKind.push(footnote)
        }
      }

      // TODO: footnotesElement doesn't reference footnotes by id, so what happens if one is updated remotely?

      return schema.nodes.footnotes_element.create(
        {
          id: foonotesElementModel._id,
          kind: foonotesElementModel.collateByKind,
          // placeholder: model.placeholderInnerHTML,
          paragraphStyle: foonotesElementModel.paragraphStyle,
        },
        footnotesOfKind
      ) as FootnotesElementNode
    },
    [ObjectTypes.Footnote]: (data) => {
      const model = data as Footnote
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.footnote.create({
        id: model._id,
        kind: model.kind,
        comments: commentNodes.map((c) => c.attrs.id),
        // placeholder: model.placeholderText
        // paragraphStyle: model.paragraphStyle,
      }) as FootnoteNode
    },
    [ObjectTypes.KeywordsElement]: (data) => {
      const model = data as KeywordsElement

      const keywordGroups = this.getKeywordGroups()

      return schema.nodes.keywords_element.create(
        {
          id: model._id,
          paragraphStyle: model.paragraphStyle,
        },
        keywordGroups
      ) as KeywordsElementNode
    },
    [ObjectTypes.Keyword]: (data) => {
      const model = data as Keyword

      return schema.nodes.keyword.create(
        {
          id: model._id,
          contents: model.name,
          comments: this.createCommentsNode(model),
        },
        schema.text(model.name)
      ) as KeywordNode
    },
    [ObjectTypes.ListElement]: (data) => {
      const model = data as ListElement
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      switch (model.elementType) {
        case 'ol':
          // TODO: wrap inline text in paragraphs
          return this.parseContents(
            model.contents || '<ol></ol>',
            undefined,
            this.getComments(model),
            {
              topNode: schema.nodes.ordered_list.create({
                id: model._id,
                paragraphStyle: model.paragraphStyle,
                comments: commentNodes.map((c) => c.attrs.id),
              }),
            }
          ) as OrderedListNode

        case 'ul':
          // TODO: wrap inline text in paragraphs
          return this.parseContents(
            model.contents || '<ul></ul>',
            undefined,
            this.getComments(model),
            {
              topNode: schema.nodes.bullet_list.create({
                id: model._id,
                paragraphStyle: model.paragraphStyle,
              }),
            }
          ) as BulletListNode

        default:
          throw new Error('Unknown list element type')
      }
    },
    [ObjectTypes.Listing]: (data) => {
      const model = data as Listing
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.listing.createChecked({
        id: model._id,
        contents: model.contents,
        language: model.language,
        languageKey: model.languageKey,
        comments: commentNodes.map((c) => c.attrs.id),
      }) as ListingNode
    },
    [ObjectTypes.ListingElement]: (data) => {
      const model = data as ListingElement

      const listingModel = this.getModel<Listing>(model.containedObjectID)

      let listing: ListingNode | PlaceholderNode
      if (listingModel) {
        listing = this.decode(listingModel) as ListingNode
      } else if (this.allowMissingElements) {
        listing = schema.nodes.placeholder.create({
          id: model.containedObjectID,
          label: 'A listing',
        }) as PlaceholderNode
      } else {
        throw new MissingElement(model.containedObjectID)
      }

      const figcaption: FigCaptionNode = this.getFigcaption(model)
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.listing_element.createChecked(
        {
          id: model._id,
          suppressCaption: model.suppressCaption,
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
          comments: commentNodes.map((c) => c.attrs.id),
        },
        [listing, figcaption]
      ) as ListingElementNode
    },
    [ObjectTypes.MissingFigure]: (data) => {
      const model = data as MissingFigure

      return schema.nodes.missing_figure.create({
        id: model._id,
        position: model.position,
      })
    },
    [ObjectTypes.ParagraphElement]: (data) => {
      const model = data as ParagraphElement
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
      return this.parseContents(
        model.contents || '<p></p>',
        undefined,
        this.getComments(model),
        {
          topNode: schema.nodes.paragraph.create({
            id: model._id,
            paragraphStyle: model.paragraphStyle,
            placeholder: model.placeholderInnerHTML,
            comments: commentNodes.map((c) => c.attrs.id),
          }),
        }
      ) as ParagraphNode
    },
    [ObjectTypes.QuoteElement]: (data) => {
      const model = data as QuoteElement

      switch (model.quoteType) {
        case 'block':
          return this.parseContents(
            model.contents || '<p></p>',
            undefined,
            this.getComments(model),
            {
              topNode: schema.nodes.blockquote_element.create({
                id: model._id,
                paragraphStyle: model.paragraphStyle,
                placeholder: model.placeholderInnerHTML,
              }),
            }
          ) as BlockquoteElementNode

        case 'pull':
          return this.parseContents(
            model.contents || '<p></p>',
            undefined,
            this.getComments(model),
            {
              topNode: schema.nodes.pullquote_element.create({
                id: model._id,
                paragraphStyle: model.paragraphStyle,
                placeholder: model.placeholderInnerHTML,
              }),
            }
          ) as PullquoteElementNode

        default:
          throw new Error('Unknown block type')
      }
    },

    [ObjectTypes.FootnotesElementWrapper]: (data) => {
      const model = data as FootnotesElementWrapper
      const paragraphElementsIDs = this.getContainedObjectIDs(
        model,
        'MPParagraphElement'
      )
      const footnotesIDs = this.getContainedObjectIDs(model, 'MPFootnote')
      const footnotesElementIDs = this.getContainedObjectIDs(
        model,
        'MPFootnotesElement'
      )
      const footnotesElements = this.createFootnotesElements(
        model,
        footnotesElementIDs
      )
      const footnotes = this.createFootnotes(model, footnotesIDs)
      const paragraphs = this.createParagraphs(model, paragraphElementsIDs)
      const content = [...paragraphs, ...footnotesElements, ...footnotes]
      return schema.nodes.footnotes_element_wrapper.create(
        {
          id: model._id,
        },
        content
      )
    },

    [ObjectTypes.Section]: (data) => {
      const model = data as Section

      const isKeywordsSection = model.category === 'MPSectionCategory:keywords'

      const elements: Element[] = []

      if (model.elementIDs) {
        for (const id of model.elementIDs) {
          const element = this.getModel<Element>(id)

          if (element) {
            // ignore deprecated editable paragraph elements in keywords sections
            if (isKeywordsSection && isParagraphElement(element)) {
              continue
            }

            elements.push(element)
          } else if (this.allowMissingElements) {
            const placeholderElement: PlaceholderElement = {
              _id: id,
              containerID: model._id,
              elementType: 'p',
              objectType: ExtraObjectTypes.PlaceholderElement,
              createdAt: timestamp(),
              updatedAt: timestamp(),
            }

            elements.push(placeholderElement)
          } else {
            throw new MissingElement(id)
          }
        }
      }

      const elementNodes: ManuscriptNode[] = elements
        .map(this.decode)
        .filter(isManuscriptNode)

      const sectionTitle = 'section_title'
      const sectionTitleNode: SectionTitleNode = model.title
        ? this.parseContents(model.title, 'h1', this.getComments(model), {
            topNode: schema.nodes[sectionTitle].create(),
          })
        : schema.nodes[sectionTitle].create()

      let sectionLabelNode: SectionTitleNode | undefined = undefined
      if (model.label) {
        sectionLabelNode = this.parseContents(
          model.label,
          'label',
          this.getComments(model),
          {
            topNode: schema.nodes.section_label.create(),
          }
        )
      }

      const nestedSections = getSections(this.modelMap)
        .filter(hasParentSection(model._id))
        .map(this.creators[ObjectTypes.Section]) as ManuscriptNode[]

      const sectionCategory = model.category || guessSectionCategory(elements)

      const sectionNodeType = chooseSectionNodeType(
        sectionCategory as SectionCategory | undefined
      )
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))

      const content: ManuscriptNode[] = (
        sectionLabelNode
          ? [sectionLabelNode, sectionTitleNode]
          : [sectionTitleNode]
      )
        .concat(elementNodes)
        .concat(nestedSections)

      const sectionNode = sectionNodeType.createAndFill(
        {
          id: model._id,
          category: sectionCategory,
          titleSuppressed: model.titleSuppressed,
          pageBreakStyle: model.pageBreakStyle,
          generatedLabel: model.generatedLabel,
          comments: commentNodes.map((c) => c.attrs.id),
        },
        content
      )

      if (!sectionNode) {
        console.error(model)
        throw new Error('Invalid content for section ' + model._id)
      }

      return sectionNode as SectionNode
    },
    [ObjectTypes.Table]: (data) => {
      const model = data as Table
      const commentNodes = this.createCommentsNode(model)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))

      return this.parseContents(
        model.contents,
        undefined,
        this.getComments(model),
        {
          topNode: schema.nodes.table.create({
            id: model._id,
            comments: commentNodes.map((c) => c.attrs.id),
          }),
        }
      ) as TableNode
    },
    [ObjectTypes.TableElement]: (data) => {
      const model = data as TableElement
      const table = this.createTable(model)
      const tableFootnotes = this.createFootnotesElementWrapper(model)
      const figcaption: FigCaptionNode = this.getFigcaption(model)
      const commentNodes = this.createCommentsNode(data)
      commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))

      const content: ManuscriptNode[] = tableFootnotes
        ? [table, figcaption, tableFootnotes]
        : [table, figcaption]

      if (model.listingID) {
        const listing = this.createListing(model)
        content.push(listing)
      } else {
        const listing = schema.nodes.listing.create()
        content.push(listing)
      }
      return schema.nodes.table_element.createChecked(
        {
          id: model._id,
          table: this.getContainedObjectIDs(model, 'MPTable')[0],
          suppressCaption: model.suppressCaption,
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
          suppressFooter: model.suppressFooter,
          suppressHeader: model.suppressHeader,
          tableStyle: model.tableStyle,
          paragraphStyle: model.paragraphStyle,
          comments: commentNodes.map((c) => c.attrs.id),
        },
        content
      ) as TableElementNode
    },
    [ObjectTypes.TOCElement]: (data) => {
      const model = data as TOCElement

      return schema.nodes.toc_element.create({
        id: model._id,
        contents: model.contents
          ? model.contents.replace(/\s+xmlns=".+?"/, '')
          : '',
        paragraphStyle: model.paragraphStyle,
      }) as TOCElementNode
    },
    [ObjectTypes.CommentAnnotation]: (data) => {
      const model = data as CommentAnnotation

      return schema.nodes.comment.create({
        id: model._id,
        contents: model.contents,
        selector: model.selector,
        target: model.target,
        resolved: model.resolved,
        contributions: model.contributions,
        originalText: model.originalText,
      }) as CommentNode
    },
    [ObjectTypes.Affiliation]: (data) => {
      const model = data as Affiliation

      return schema.nodes.affiliation.create({
        id: model._id,
        institution: model.institution,
        addressLine1: model.addressLine1,
        addressLine2: model.addressLine2,
        addressLine3: model.addressLine3,
        postCode: model.postCode,
        country: model.country,
        email: model.email,
      }) as AffiliationNode
    },
    [ObjectTypes.Contributor]: (data) => {
      const model = data as Contributor

      return schema.nodes.contributor.create({
        id: model._id,
        role: model.role,
        affiliations: model.affiliations,
        bibliographicName: model.bibliographicName,
        userID: model.userID,
        invitationID: model.invitationID,
        isCorresponding: model.isCorresponding,
        ORCIDIdentifier: model.ORCIDIdentifier,
      }) as ContributorNode
    },
  }

  private createAffiliationListNode() {
    const affiliationNodes = getAffiliations(this.modelMap)
      .map((affiliation) => this.decode(affiliation) as AffiliationNode)
      .filter(Boolean) as AffiliationNode[]

    return schema.nodes.affiliation_list.createAndFill(
      {},
      affiliationNodes
    ) as AffiliationListNode
  }

  private createContributorListNode() {
    const contributorNodes = getContributors(this.modelMap)
      .map((contributor) => this.decode(contributor) as ContributorNode)
      .filter(Boolean) as ContributorNode[]

    return schema.nodes.contributor_list.createAndFill(
      {},
      contributorNodes
    ) as ContributorListNode
  }

  private createMetaSectionNode() {
    const affiliationListNode = this.createAffiliationListNode()
    const contributorListNode = this.createContributorListNode()
    const commentListNode = this.createCommentListNode()
    return schema.nodes.meta_section.createAndFill({}, [
      affiliationListNode,
      contributorListNode,
      commentListNode,
    ]) as MetaSectionNode
  }

  private createCommentListNode() {
    return schema.nodes.comment_list.createAndFill({}, [
      ...this.comments.values(),
    ]) as CommentListNode
  }

  private createRootSectionNodes() {
    let rootSections = getSections(this.modelMap).filter(
      (section) => !section.path || section.path.length <= 1
    )
    rootSections = this.addGeneratedLabels(rootSections)
    const rootSectionNodes = rootSections
      .map(this.decode)
      .filter(isManuscriptNode) as SectionNode[]
    if (!rootSectionNodes.length) {
      rootSectionNodes.push(
        schema.nodes.section.createAndFill({
          id: generateNodeID(schema.nodes.section),
        }) as SectionNode
      )
    }
    return rootSectionNodes
  }

  private createCommentsNode(model: Model) {
    const comments: ManuscriptNode[] = []
    for (const comment of this.getComments(model)) {
      comments.push(this.decode(comment) as ManuscriptNode)
    }
    return comments
  }

  private getComments(model: Model) {
    return Array.from(this.modelMap.values()).filter(
      (c) => isCommentAnnotation(c) && c.target === model._id
    ) as CommentAnnotation[]
  }

  private extractListing(model: FigureElement) {
    if (model.listingID) {
      return this.createListing(model)
    }
  }

  constructor(modelMap: Map<string, Model>, allowMissingElements = false) {
    this.modelMap = modelMap
    this.allowMissingElements = allowMissingElements
  }

  public decode = (model: Model): ManuscriptNode | null => {
    if (!this.creators[model.objectType]) {
      warn(`No converter for ${model.objectType}`)
      return null
    }

    return this.creators[model.objectType](model)
  }

  public getModel = <T extends Model>(id: string): T | undefined =>
    this.modelMap.get(id) as T | undefined

  public createArticleNode = (manuscriptID?: string): ManuscriptNode => {
    const rootSectionNodes = this.createRootSectionNodes()
    const metaSectionNode = this.createMetaSectionNode()
    const contents: ManuscriptNode[] = [...rootSectionNodes, metaSectionNode]

    return schema.nodes.manuscript.create(
      {
        id: manuscriptID || this.getManuscriptID(),
      },
      contents
    )
  }

  public addGeneratedLabels = (sections: Section[]) => {
    const nextLableCount = { Appendix: 1 }
    return sections.map((section) => {
      if (section.generatedLabel) {
        const secType = section.category
          ? chooseSecType(section.category as SectionCategory)
          : undefined

        // For now only generate labels for appendicies
        if (secType === 'appendices') {
          section.label = `${chooseSectionLableName(secType)} ${
            nextLableCount['Appendix']
          }`

          nextLableCount['Appendix'] += 1
        } else {
          // Remove the label for other category types
          delete section.label
        }
      }

      return section
    })
  }

  public parseContents = (
    contents: string,
    wrapper?: string,
    commentAnnotations: CommentAnnotation[] = [],
    options?: ParseOptions
  ): ManuscriptNode => {
    const contentsWithComments = commentAnnotations.length
      ? insertHighlightMarkers(contents, commentAnnotations)
      : contents

    const wrappedContents = wrapper
      ? `<${wrapper}>${contentsWithComments}</${wrapper}>`
      : contentsWithComments

    const html = wrappedContents.trim()

    if (!html.length) {
      throw new Error('No HTML to parse')
    }

    const template = document.createElement('template')
    template.innerHTML = html

    if (!template.content.firstElementChild) {
      throw new Error('No content could be parsed')
    }

    return parser.parse(template.content.firstElementChild, options)
  }

  private getKeywords = (id: string) => {
    const keywordsOfKind = []
    const keywordsByGroup = [...this.modelMap.values()].filter(
      (m) =>
        m.objectType === ObjectTypes.Keyword &&
        (m as Keyword).containedGroup === id
    )
    for (const model of keywordsByGroup) {
      if (isKeyword(model)) {
        const keyword = this.parseContents(
          model.name || '',
          'div',
          this.getComments(model),
          {
            topNode: schema.nodes.keyword.create({
              id: model._id,
              contents: model.name,
            }),
          }
        ) as KeywordNode

        keywordsOfKind.push(keyword)
      }
    }

    return keywordsOfKind
  }

  private getManuscriptID = () => {
    for (const item of this.modelMap.values()) {
      if (isManuscript(item)) {
        return item._id
      }
    }
  }

  private getFigcaption = (
    model: FigureElement | TableElement | EquationElement | ListingElement
  ) => {
    const titleNode = schema.nodes.caption_title.create() as CaptionTitleNode

    const captionTitle = model.title
      ? this.parseContents(
          model.title,
          'caption_title',
          this.getComments(model),
          {
            topNode: titleNode,
          }
        )
      : titleNode

    // test if model caption is html content (e.g. in figure_element)
    if (model.caption && /<\/?[a-z][\s\S]*>/i.test(model.caption)) {
      const captionDoc = document.createElement('div')
      captionDoc.innerHTML = model.caption

      const content = [captionTitle]

      const paragraphs = captionDoc.querySelectorAll('p')
      for (const paragraph of paragraphs) {
        const captionNode = schema.nodes.caption.create() as CaptionNode

        const caption = this.parseContents(
          paragraph.outerHTML,
          'caption',
          this.getComments(model),
          {
            topNode: captionNode,
          }
        )
        content.push(caption)
      }

      return schema.nodes.figcaption.create({}, content)
    }

    const captionNode = schema.nodes.caption.create() as CaptionNode

    const caption = model.caption
      ? this.parseContents(model.caption, 'caption', this.getComments(model), {
          topNode: captionNode,
        })
      : captionNode

    return schema.nodes.figcaption.create({}, [captionTitle, caption])
  }

  private createFootnotesElements(
    model: FootnotesElementWrapper,
    footnotesElementIDs: string[]
  ) {
    const footnotesElements: (PlaceholderNode | FootnotesElementNode)[] = []
    footnotesElementIDs?.forEach((footnotesElementID) => {
      const footnotesElementModel =
        this.getModel<FootnotesElement>(footnotesElementID)

      let footnotesElement: FootnotesElementNode | PlaceholderNode
      if (footnotesElementModel) {
        footnotesElement = this.decode(
          footnotesElementModel
        ) as FootnotesElementNode
      } else if (this.allowMissingElements) {
        footnotesElement = schema.nodes.placeholder.create({
          id: footnotesElementIDs,
          label: 'Footnotes element',
        }) as PlaceholderNode
      } else {
        throw new MissingElement(footnotesElementID)
      }
      footnotesElements.push(footnotesElement)
    })
    return footnotesElements
  }

  private createParagraphs(model: any, paragraphElementsIDs: string[]) {
    const paragraphElements: Node[] = []
    paragraphElementsIDs?.forEach((paragraphElementID) => {
      const paragraphElementModel =
        this.getModel<ParagraphElement>(paragraphElementID)

      let paragraphElement
      if (paragraphElementModel) {
        paragraphElement = this.decode(paragraphElementModel) as ParagraphNode
      } else if (this.allowMissingElements) {
        paragraphElement = schema.nodes.placeholder.create({
          _id: paragraphElementID,
          containerID: model._id,
          elementType: 'p',
          objectType: ExtraObjectTypes.PlaceholderElement,
          createdAt: timestamp(),
          updatedAt: timestamp(),
        })
      } else {
        throw new MissingElement(paragraphElementID)
      }
      paragraphElements.push(paragraphElement)
    })
    return paragraphElements
  }
  private createFootnotes(
    model: FootnotesElementWrapper,
    footnotesIDs: string[]
  ) {
    const footnotes: FootnoteNode[] = []
    footnotesIDs?.forEach((footnoteID) => {
      const footnoteModel = this.getModel<Footnote>(footnoteID)
      if (footnoteModel) {
        const commentNodes = this.createCommentsNode(footnoteModel)
        commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
        const footnote = this.parseContents(
          footnoteModel.contents || '<div></div>',
          undefined,
          this.getComments(footnoteModel),
          {
            topNode: schema.nodes.footnote.create({
              id: footnoteModel._id,
              kind: footnoteModel.kind,
              comments: commentNodes.map((c) => c.attrs.id),
            }),
          }
        ) as FootnoteNode
        footnotes.push(footnote)
      }
    })
    return footnotes
  }

  private createTable(model: TableElement) {
    const tableId = this.getContainedObjectIDs(model, 'MPTable')[0]
    const tableModel = this.getModel<Table>(tableId)

    let table: TableNode | PlaceholderNode
    if (tableModel) {
      table = this.decode(tableModel) as TableNode
    } else if (this.allowMissingElements) {
      table = schema.nodes.placeholder.create({
        id: tableId,
        label: 'A table',
      }) as PlaceholderNode
    } else {
      throw new MissingElement(tableId)
    }
    return table
  }

  private createFootnotesElementWrapper(model: TableElement) {
    const tableFootnotesId = this.getContainedObjectIDs(
      model,
      'MPFootnotesElementWrapper'
    )[0]
    const tableFootnotesModel =
      this.getModel<FootnotesElementWrapper>(tableFootnotesId)

    return tableFootnotesModel
      ? (this.decode(tableFootnotesModel) as FootnotesElementWrapperNode)
      : undefined
  }
  private getContainedObjectIDs(model: any, type: string): string[] {
    return (
      model.containedObjectIDs?.filter((id: string) =>
        id.startsWith(type + ':')
      ) ||
      model.containedObjectID ||
      []
    )
  }
  private createListing(model: any) {
    const listingModel = this.getModel<Listing>(model.listingID)
    let listing: ListingNode | PlaceholderNode

    if (listingModel) {
      listing = this.decode(listingModel) as ListingNode
    } else if (this.allowMissingElements) {
      listing = schema.nodes.placeholder.create({
        id: model.listingID,
        label: 'A listing',
      }) as PlaceholderNode
    } else {
      throw new MissingElement(model.listingID)
    }
    return listing
  }

  private getKeywordGroups() {
    const kwdGroupNodes: KeywordsGroupNode[] = []
    const kwdGroupsModels: KeywordGroup[] | undefined = [
      ...this.modelMap.values(),
    ].filter(
      (model) => model.objectType === ObjectTypes.KeywordGroup
    ) as KeywordGroup[]
    if (kwdGroupsModels.length > 0) {
      for (const kwdGroupModel of kwdGroupsModels) {
        const keywords = this.getKeywords(kwdGroupModel._id)
        const commentNodes = this.createCommentsNode(kwdGroupModel)
        commentNodes.forEach((c) => this.comments.set(c.attrs.id, c))
        const contents: ManuscriptNode[] = []
        // if (kwdGroupModel.title) {
        //   const titleNode = this.parseContents(
        //     kwdGroupModel.title,
        //     'section_title',
        //     this.getComments(kwdGroupModel),
        //     {
        //       topNode: schema.nodes.section_title.create(),
        //     }
        //   )
        //   contents.push(titleNode)
        // }
        contents.push(...keywords)
        const kwdGroupNode = schema.nodes.keywords_group.create(
          {
            id: kwdGroupModel._id,
            type: kwdGroupModel.type,
            comments: commentNodes.map((c) => c.attrs.id),
          },
          contents
        ) as KeywordsGroupNode
        kwdGroupNodes.push(kwdGroupNode)
      }
    }
    return kwdGroupNodes
  }
}
