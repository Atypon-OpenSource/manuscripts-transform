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
  AuthorNotes,
  BibliographyElement,
  BibliographyItem,
  CommentAnnotation,
  Contributor,
  Corresponding,
  Element,
  Equation,
  EquationElement,
  Figure,
  FigureElement,
  Footnote,
  FootnotesElement,
  FootnotesOrder,
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
  Supplement,
  Table,
  TableElement,
  TableElementFooter,
  Titles,
  TOCElement,
} from '@manuscripts/json-schema'
import debug from 'debug'
import { DOMParser, ParseOptions } from 'prosemirror-model'

import { MissingElement } from '../errors'
import {
  abstractsType,
  backmatterType,
  bodyType,
} from '../lib/section-group-type'
import {
  AffiliationNode,
  BibliographyElementNode,
  BibliographyItemNode,
  BlockquoteElementNode,
  BulletListNode,
  CaptionNode,
  CaptionTitleNode,
  CommentNode,
  ContributorNode,
  EquationElementNode,
  EquationNode,
  FigCaptionNode,
  FigureElementNode,
  FigureNode,
  FootnoteNode,
  FootnotesElementNode,
  KeywordNode,
  KeywordsElementNode,
  KeywordsNode,
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
  SupplementNode,
  SupplementsNode,
  TableElementFooterNode,
  TableElementNode,
  TitleNode,
  TOCElementNode,
} from '../schema'
import { AuthorNotesNode } from '../schema/nodes/author_notes'
import { KeywordGroupNode } from '../schema/nodes/keyword_group'
import { buildTitles } from './builders'
import { insertHighlightMarkers } from './highlight-markers'
import { PlaceholderElement } from './models'
import {
  ExtraObjectTypes,
  isCommentAnnotation,
  isManuscript,
} from './object-types'
import {
  chooseSectionLableName,
  chooseSectionNodeType,
  chooseSecType,
  getSectionGroupType,
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

const getAuthorNotes = (modelMap: Map<string, Model>) =>
  getModelsByType<AuthorNotes>(modelMap, ObjectTypes.AuthorNotes)
const getContributors = (modelMap: Map<string, Model>) =>
  getModelsByType<Affiliation>(modelMap, ObjectTypes.Contributor)

const getKeywordElements = (modelMap: Map<string, Model>) =>
  getModelsByType<KeywordsElement>(modelMap, ObjectTypes.KeywordsElement)

const getSupplements = (modelMap: Map<string, Model>) =>
  getModelsByType<KeywordsElement>(modelMap, ObjectTypes.Supplement)

const getKeywordGroups = (modelMap: Map<string, Model>) =>
  getModelsByType<KeywordGroup>(modelMap, ObjectTypes.KeywordGroup)

const getKeywords = (modelMap: Map<string, Model>) =>
  getModelsByType<Keyword>(modelMap, ObjectTypes.Keyword)

const getTitles = (modelMap: Map<string, Model>) =>
  getModelsByType<Titles>(modelMap, ObjectTypes.Titles)[0]

const hasParentSection = (id: string) => (section: Section) =>
  section.path &&
  section.path.length > 1 &&
  section.path[section.path.length - 2] === id

const deprecatedCategories = [
  'MPSectionCategory:contributors',
  'MPSectionCategory:affiliations',
  'MPSectionCategory:keywords',
]

export class Decoder {
  private readonly modelMap: Map<string, Model>
  private readonly allowMissingElements: boolean
  private comments: Map<string, ManuscriptNode> = new Map<
    string,
    ManuscriptNode
  >()

  private creators: NodeCreatorMap = {
    [ObjectTypes.Titles]: (data) => {
      const model = data as Titles

      return this.parseContents(model.title, 'div', undefined, {
        topNode: schema.nodes.title.create({
          id: model._id,
        }),
      }) as TitleNode
    },
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

      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
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
        comments: comments.map((c) => c.attrs.id),
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

      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.figure.create({
        id: model._id,
        contentType: model.contentType,
        src: model.src,
        position: model.position,
        comments: comments.map((c) => c.attrs.id),
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

      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
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
          comments: comments.map((c) => c.attrs.id),
        },
        content
      ) as FigureElementNode
    },
    [ObjectTypes.Equation]: (data) => {
      const model = data as Equation

      return schema.nodes.equation.createChecked({
        id: model._id,
        contents: model.contents,
        format: model.format,
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

      return schema.nodes.equation_element.createChecked(
        {
          id: model._id,
          label: model.label,
        },
        [equation]
      ) as EquationElementNode
    },
    [ObjectTypes.FootnotesElement]: (data) => {
      const foonotesElementModel = data as FootnotesElement

      const footnotesOfKind: FootnoteNode[] = []

      const footnoteOrder = getModelsByType<FootnotesOrder>(
        this.modelMap,
        ObjectTypes.FootnotesOrder
      ).find((model) => model.containedObjectID === data._id)

      if (footnoteOrder) {
        footnoteOrder.footnotesList.map(({ id }) => {
          const model = this.modelMap.get(id) as Footnote

          const collateByKind = foonotesElementModel.collateByKind || 'footnote'
          if (model.kind === collateByKind) {
            const comments = this.createCommentNodes(model)
            comments.forEach((c) => this.comments.set(c.attrs.id, c))
            const footnote = this.parseContents(
              model.contents || '<div></div>',
              undefined,
              this.getComments(model),
              {
                topNode: schema.nodes.footnote.create({
                  id: model._id,
                  kind: model.kind,
                  comments: comments.map((c) => c.attrs.id),
                  // placeholder: model.placeholderText
                  // paragraphStyle: model.paragraphStyle,
                }),
              }
            ) as FootnoteNode

            footnotesOfKind.push(footnote)
          }
        })
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
      const footnoteModel = data as Footnote
      const comments = this.createCommentNodes(footnoteModel)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return this.parseContents(
        footnoteModel.contents || '<div></div>',
        undefined,
        this.getComments(footnoteModel),
        {
          topNode: schema.nodes.footnote.create({
            id: footnoteModel._id,
            kind: footnoteModel.kind,
            comments: comments.map((c) => c.attrs.id),
          }),
        }
      ) as FootnoteNode
    },
    [ObjectTypes.KeywordsElement]: (data) => {
      const model = data as KeywordsElement

      const keywordGroups = getKeywordGroups(this.modelMap).map(
        (k) => this.decode(k) as KeywordGroupNode
      )

      return schema.nodes.keywords_element.create(
        {
          id: model._id,
          paragraphStyle: model.paragraphStyle,
        },
        keywordGroups
      ) as KeywordsElementNode
    },
    [ObjectTypes.KeywordGroup]: (data) => {
      const keywordGroup = data as KeywordGroup
      const keywords = getKeywords(this.modelMap)
        .filter((k) => k.containedGroup === keywordGroup._id)
        .map((k) => this.decode(k) as KeywordNode)

      const comments = this.createCommentNodes(keywordGroup)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.keyword_group.create(
        {
          id: keywordGroup._id,
          type: keywordGroup.type,
          comments: comments.map((c) => c.attrs.id),
        },
        keywords
      ) as KeywordGroupNode
    },
    [ObjectTypes.Keyword]: (data) => {
      const keyword = data as Keyword

      const comments = this.createCommentNodes(keyword)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))

      return schema.nodes.keyword.create(
        {
          id: keyword._id,
          contents: keyword.name,
          comments: comments.map((c) => c.attrs.id),
        },
        schema.text(keyword.name)
      ) as KeywordNode
    },
    [ObjectTypes.ListElement]: (data) => {
      const model = data as ListElement
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
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
                listStyleType: model.listStyleType,
                paragraphStyle: model.paragraphStyle,
                comments: comments.map((c) => c.attrs.id),
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
                listStyleType: model.listStyleType,
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
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.listing.createChecked({
        id: model._id,
        contents: model.contents,
        language: model.language,
        languageKey: model.languageKey,
        comments: comments.map((c) => c.attrs.id),
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
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return schema.nodes.listing_element.createChecked(
        {
          id: model._id,
          suppressCaption: model.suppressCaption,
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
          comments: comments.map((c) => c.attrs.id),
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
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
      return this.parseContents(
        model.contents || '<p></p>',
        undefined,
        this.getComments(model),
        {
          topNode: schema.nodes.paragraph.create({
            id: model._id,
            paragraphStyle: model.paragraphStyle,
            placeholder: model.placeholderInnerHTML,
            comments: comments.map((c) => c.attrs.id),
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
    [ObjectTypes.TableElementFooter]: (data) => {
      const model = data as TableElementFooter
      const contents: ManuscriptNode[] = []
      const generalTableFootnotes: ManuscriptNode[] = []
      const footnotesElements: ManuscriptNode[] = []
      for (const containedObjectID of model.containedObjectIDs) {
        const model = this.modelMap.get(containedObjectID) as Model
        if (model.objectType === ObjectTypes.ParagraphElement) {
          const paragraph = this.decode(model)
          if (paragraph) {
            generalTableFootnotes.push(paragraph)
          }
        } else {
          footnotesElements.push(this.decode(model) as ManuscriptNode)
        }
      }
      if (generalTableFootnotes && generalTableFootnotes.length) {
        contents.push(
          schema.nodes.general_table_footnote.create({}, [
            ...generalTableFootnotes,
          ])
        )
      }
      if (footnotesElements && footnotesElements.length) {
        contents.push(...footnotesElements)
      }
      return schema.nodes.table_element_footer.create(
        {
          id: model._id,
        },
        contents
      )
    },

    [ObjectTypes.AuthorNotes]: (data) => {
      const model = data as AuthorNotes
      const content = model.containedObjectIDs.map((id) =>
        this.decode(this.modelMap.get(id) as Model)
      ) as ManuscriptNode[]
      return schema.nodes.author_notes.create(
        {
          id: model._id,
        },
        content
      )
    },
    [ObjectTypes.Corresponding]: (data) => {
      const model = data as Corresponding
      return this.parseContents(model.contents, 'corresp', [], {
        topNode: schema.nodes.corresp.create({
          id: model._id,
          label: model.label,
        }),
      })
    },
    [ObjectTypes.Section]: (data) => {
      const model = data as Section
      const elements: Element[] = []

      if (model.elementIDs) {
        for (const id of model.elementIDs) {
          const element = this.getModel<Element>(id)

          if (element) {
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

      const elementNodes: ManuscriptNode[] = elements.map(
        (e) => this.decode(e) as ManuscriptNode
      )

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
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))
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
          comments: comments.map((c) => c.attrs.id),
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
      return this.parseContents(model.contents, undefined, [], {
        topNode: schema.nodes.table.create({
          id: model._id,
        }),
      })
    },
    [ObjectTypes.TableElement]: (data) => {
      const model = data as TableElement
      const table = this.createTable(model)
      const tableColGroup = this.createTableColGroup(model)
      const tableElementFooter = this.createTableElementFooter(model)
      const figcaption: FigCaptionNode = this.getFigcaption(model)
      const comments = this.createCommentNodes(model)
      comments.forEach((c) => this.comments.set(c.attrs.id, c))

      const content: ManuscriptNode[] = [table]
      if (tableColGroup) {
        content.push(tableColGroup)
      }
      if (tableElementFooter) {
        content.push(tableElementFooter)
      }

      content.push(figcaption)

      const listing = model.listingID
        ? this.createListing(model.listingID)
        : schema.nodes.listing.create()

      content.push(listing)
      return schema.nodes.table_element.createChecked(
        {
          id: model._id,
          table: model.containedObjectID,
          suppressCaption: model.suppressCaption,
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
          suppressFooter: model.suppressFooter,
          suppressHeader: model.suppressHeader,
          tableStyle: model.tableStyle,
          paragraphStyle: model.paragraphStyle,
          comments: comments.map((c) => c.attrs.id),
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

      return schema.nodes.affiliation.create(
        {
          id: model._id,
          institution: model.institution,
          addressLine1: model.addressLine1,
          addressLine2: model.addressLine2,
          addressLine3: model.addressLine3,
          postCode: model.postCode,
          country: model.country,
          county: model.county,
          city: model.city,
          email: model.email,
          department: model.department,
          priority: model.priority,
        },
        schema.text('_') // placeholder to ensure correct track-changes functioning
      ) as AffiliationNode
    },
    [ObjectTypes.Contributor]: (data) => {
      const model = data as Contributor

      return schema.nodes.contributor.create(
        {
          id: model._id,
          role: model.role,
          affiliations: model.affiliations,
          email: model.email,
          isJointContributor: model.isJointContributor,
          bibliographicName: model.bibliographicName,
          userID: model.userID,
          invitationID: model.invitationID,
          isCorresponding: model.isCorresponding,
          ORCIDIdentifier: model.ORCIDIdentifier,
          footnote: model.footnote,
          corresp: model.corresp,
          priority: model.priority,
        },
        schema.text('_') // placeholder to ensure correct track-changes functioning
      ) as ContributorNode
    },
    [ObjectTypes.Supplement]: (data) => {
      const model = data as Supplement

      return schema.nodes.supplement.create({
        id: model._id,
        href: model.href,
        mimeType: model.MIME?.split('/')[0],
        mimeSubType: model.MIME?.split('/')[1],
        title: model.title,
      }) as SupplementNode
    },
  }

  private createTitleNode() {
    const titles = getTitles(this.modelMap) || buildTitles()
    return this.decode(titles) as TitleNode
  }

  private createAffiliationsNode() {
    const affiliations = getAffiliations(this.modelMap)
      .map((a) => this.decode(a) as AffiliationNode)
      .filter(Boolean)

    return schema.nodes.affiliations.createAndFill(
      {},
      affiliations
    ) as ManuscriptNode
  }

  private createContributorsNode() {
    const contributors = getContributors(this.modelMap)
      .map((c) => this.decode(c) as ContributorNode)
      .filter(Boolean)
    const authorNotes = getAuthorNotes(this.modelMap)
      .map((authorNote) => this.decode(authorNote) as AuthorNotesNode)
      .filter(Boolean)
    const content: ManuscriptNode[] = [...contributors, ...authorNotes]
    return schema.nodes.contributors.createAndFill(
      {},
      content
    ) as ManuscriptNode
  }

  private createKeywordsNode() {
    const elements = getKeywordElements(this.modelMap)
      .map((e) => this.decode(e) as KeywordsElementNode)
      .filter(Boolean)

    return schema.nodes.keywords.createAndFill({}, [
      schema.nodes.section_title.create({}, schema.text('Keywords')),
      ...elements,
    ]) as KeywordsNode
  }

  private createSupplementsNode() {
    const elements = getSupplements(this.modelMap)
      .map((e) => this.decode(e) as SupplementNode)
      .filter(Boolean)

    return schema.nodes.supplements.createAndFill({}, [
      schema.nodes.section_title.create(
        {},
        schema.text('SupplementaryMaterials')
      ),
      ...elements,
    ]) as SupplementsNode
  }

  private createCommentsNode() {
    return schema.nodes.comments.createAndFill({}, [
      ...this.comments.values(),
    ]) as ManuscriptNode
  }

  private createContentSections() {
    let sections = getSections(this.modelMap)

    sections = this.addGeneratedLabels(sections)

    const groups = {
      abstracts: [] as SectionNode[],
      body: [] as SectionNode[],
      backmatter: [] as SectionNode[],
    }

    for (const section of sections) {
      if (section.path.length > 1) {
        continue
      }
      const category = section.category
      if (category && deprecatedCategories.includes(category)) {
        continue
      }
      const group = category ? getSectionGroupType(category) : bodyType
      groups[group._id].push(this.decode(section) as SectionNode)
    }

    const abstracts = schema.nodes.abstracts.createAndFill(
      {},
      groups[abstractsType._id]
    ) as ManuscriptNode
    const body = schema.nodes.body.createAndFill(
      {},
      groups[bodyType._id]
    ) as ManuscriptNode
    const backmatter = schema.nodes.backmatter.createAndFill(
      {},
      groups[backmatterType._id]
    ) as ManuscriptNode

    return {
      abstracts,
      body,
      backmatter,
    }
  }

  private createCommentNodes(model: Model) {
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
      return this.createListing(model.listingID)
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
    const title = this.createTitleNode()
    const contributors = this.createContributorsNode()
    const affiliations = this.createAffiliationsNode()
    const keywords = this.createKeywordsNode()
    const suppl = this.createSupplementsNode()
    const { abstracts, body, backmatter } = this.createContentSections()
    const comments = this.createCommentsNode()
    const contents: ManuscriptNode[] = [
      title,
      contributors,
      affiliations,
      keywords,
      suppl,
      abstracts,
      body,
      backmatter,
      comments,
    ]

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

  private createTable(model: TableElement) {
    const tableID = model.containedObjectID
    const tableModel = this.getModel<Table>(tableID)

    let table: ManuscriptNode | PlaceholderNode
    if (tableModel) {
      table = this.decode(tableModel) as ManuscriptNode
    } else if (this.allowMissingElements) {
      table = schema.nodes.placeholder.create({
        id: tableID,
        label: 'A table',
      }) as PlaceholderNode
    } else {
      throw new MissingElement(tableID)
    }
    return table
  }
  private createTableColGroup(model: TableElement) {
    const tableID = model.containedObjectID
    const tableModel = this.getModel<Table>(tableID)
    if (!tableModel || !tableModel.contents.includes('<colgroup>')) {
      return undefined
    }
    return this.parseContents(tableModel.contents, undefined, [], {
      topNode: schema.nodes.table_colgroup.create(),
    })
  }

  private createTableElementFooter(model: TableElement) {
    const tableElementFooterID = model.tableElementFooterID
    if (!tableElementFooterID) {
      return undefined
    }
    const tableElementFooterModel =
      this.getModel<TableElementFooter>(tableElementFooterID)

    return tableElementFooterModel
      ? (this.decode(tableElementFooterModel) as TableElementFooterNode)
      : undefined
  }
  private createListing(id: string) {
    const listing = this.getModel<Listing>(id)

    if (listing) {
      return this.decode(listing) as ListingNode
    } else if (this.allowMissingElements) {
      return schema.nodes.placeholder.create({
        id,
        label: 'A listing',
      }) as PlaceholderNode
    } else {
      throw new MissingElement(id)
    }
  }
}
