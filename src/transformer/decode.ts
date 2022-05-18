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
  BibliographyElement,
  Element,
  Equation,
  EquationElement,
  Figure,
  FigureElement,
  Footnote,
  FootnotesElement,
  HighlightMarker,
  KeywordsElement,
  ListElement,
  Listing,
  ListingElement,
  Model,
  MultiGraphicFigureElement,
  ObjectTypes,
  ParagraphElement,
  QuoteElement,
  Section,
  Table,
  TableElement,
  TOCElement,
} from '@manuscripts/manuscripts-json-schema'
import { RxDocument } from '@manuscripts/rxdb'
import debug from 'debug'
import { DOMParser, ParseOptions } from 'prosemirror-model'

import { MissingElement } from '../errors'
import {
  BibliographyElementNode,
  BlockquoteElementNode,
  BulletListNode,
  CaptionNode,
  EquationElementNode,
  EquationNode,
  FigCaptionNode,
  FigureElementNode,
  FigureNode,
  FootnoteNode,
  FootnotesElementNode,
  ListingElementNode,
  ListingNode,
  ManuscriptNode,
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
import { CaptionTitleNode } from '../schema/nodes/caption_title'
import { MultiGraphicFigureElementNode } from '../schema/nodes/multi_graphic_figure_element'
import { insertHighlightMarkers } from './highlight-markers'
import { generateNodeID } from './id'
import { PlaceholderElement } from './models'
import {
  ExtraObjectTypes,
  hasObjectType,
  isFigure,
  isManuscript,
  isUserProfile,
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
  const { _rev, _deleted, updatedAt, createdAt, sessionID, ...data } = model

  return data as T
}

export const getAttachment = async (
  doc: RxDocument<Model>,
  key: string
): Promise<string | undefined> => {
  const attachment = doc.getAttachment(key)
  if (!attachment) {
    return undefined
  }

  const data = await attachment.getData()
  if (!data) {
    return undefined
  }

  return window.URL.createObjectURL(data)
}

export const buildModelMap = async (
  docs: Array<RxDocument<Model>>
): Promise<Map<string, Model>> => {
  const items: Map<string, RxDocument<Model>> = new Map()
  const output: Map<string, Model> = new Map()

  await Promise.all(
    docs.map(async (doc) => {
      items.set(doc._id, doc)
      output.set(doc._id, getModelData(doc.toJSON()))
    })
  )

  for (const model of output.values()) {
    if (isFigure(model)) {
      if (model.listingAttachment) {
        const { listingID, attachmentKey } = model.listingAttachment

        const listingDoc = items.get(listingID)

        if (listingDoc) {
          model.src = await getAttachment(listingDoc, attachmentKey)
        }
      } else {
        const figureDoc = items.get(model._id)

        if (figureDoc) {
          model.src = await getAttachment(figureDoc, 'image')
        }
      }
    }
    // TODO: enable once tables can be images
    // else if (isTable(model)) {
    //   if (model.listingAttachment) {
    //     const { listingID, attachmentKey } = model.listingAttachment
    //     const listingDoc = items.get(listingID)
    //
    //     if (listingDoc) {
    //       model.src = await getAttachment(listingDoc, attachmentKey)
    //     }
    //   } else {
    //     const tableDoc = items.get(model._id)!
    //     model.src = await getAttachment(tableDoc, 'image')
    //   }
    // }
    else if (isUserProfile(model)) {
      const userProfileDoc = items.get(model._id)

      if (userProfileDoc) {
        model.avatar = await getAttachment(userProfileDoc, 'image')
      }
    }
  }

  return output
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

export const isManuscriptNode = (
  model: ManuscriptNode | null
): model is ManuscriptNode => model !== null

const isParagraphElement = hasObjectType<ParagraphElement>(
  ObjectTypes.ParagraphElement
)

const isFootnote = hasObjectType<Footnote>(ObjectTypes.Footnote)

const hasParentSection = (id: string) => (section: Section) =>
  section.path &&
  section.path.length > 1 &&
  section.path[section.path.length - 2] === id

export class Decoder {
  private readonly modelMap: Map<string, Model>
  private readonly allowMissingElements: boolean

  private creators: NodeCreatorMap = {
    [ObjectTypes.BibliographyElement]: (data) => {
      const model = data as BibliographyElement
      const html = this.extractedHTML(
        model.highlightMarkers,
        'contents',
        model.contents,
        undefined
      )

      return schema.nodes.bibliography_element.create({
        id: model._id,
        contents: html ? html.replace(/\s+xmlns=".+?"/, '') : '',
        paragraphStyle: model.paragraphStyle,
      }) as BibliographyElementNode
    },
    [ExtraObjectTypes.PlaceholderElement]: (data) => {
      const model = data as PlaceholderElement

      return schema.nodes.placeholder_element.create({
        id: model._id,
      }) as PlaceholderElementNode
    },
    [ObjectTypes.Figure]: (data) => {
      const model = data as Figure
      const paragraphs: Array<ParagraphNode> = []
      model.containedObjectIDs?.forEach((id) => {
        const paragraphModel = this.getModel<ParagraphElement>(id)
        return (
          paragraphModel &&
          paragraphs.push(this.decode(paragraphModel) as ParagraphNode)
        )
      })
      const figcaptionNode: FigCaptionNode = schema.nodes.figcaption.create()

      const figcaption: FigCaptionNode = model.title
        ? this.parseContents(
            'title',
            model.title,
            'figcaption',
            model.highlightMarkers,
            {
              topNode: figcaptionNode,
            }
          )
        : figcaptionNode

      return schema.nodes.figure.create(
        {
          id: model._id,
          contentType: model.contentType,
          src: model.src,
          listingAttachment: model.listingAttachment,
          embedURL: model.embedURL,
          attribution: model.attribution,
          externalFileReferences: model.externalFileReferences,
          missingImage: model.missingImage,
          position: model.position,
        },
        [figcaption, ...paragraphs]
      )
    },
    [ObjectTypes.MultiGraphicFigureElement]: (data) => {
      const model = data as MultiGraphicFigureElement

      const figcaption: FigCaptionNode = this.getFigcaption(model)

      // TODO: use layout to prefill figures?

      const figures = this.extractFigures(model)

      const content: ManuscriptNode[] = [...figures, figcaption]

      const listing = this.extractListing(model)
      if (listing) {
        content.push(listing)
      } else {
        const listing = schema.nodes.listing.create()
        content.push(listing)
      }

      return schema.nodes.multi_graphic_figure_element.createChecked(
        {
          id: model._id,
          figureLayout: model.figureLayout,
          figureStyle: model.figureStyle,
          alignment: model.alignment,
          sizeFraction: model.sizeFraction,
          suppressCaption: Boolean(model.suppressCaption),
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
        },
        content
      ) as MultiGraphicFigureElementNode
    },
    [ObjectTypes.FigureElement]: (data) => {
      const model = data as FigureElement

      const figcaption: FigCaptionNode = this.getFigcaption(model)

      // TODO: use layout to prefill figures?

      const figures = this.extractFigures(model)

      const content: ManuscriptNode[] = [...figures, figcaption]

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
          figureStyle: model.figureStyle,
          alignment: model.alignment,
          sizeFraction: model.sizeFraction,
          suppressCaption: Boolean(model.suppressCaption),
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
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
      const model = data as FootnotesElement

      const id = model._id
      const footnotesOfKind = []

      for (const innerModel of this.modelMap.values()) {
        if (isFootnote(innerModel) && innerModel.containingObject === id) {
          const paragraphs: Array<ParagraphNode> = []
          const template = document.createElement('div')
          template.innerHTML = innerModel.contents
          template.querySelectorAll('p').forEach((element) => {
            paragraphs.push(
              this.parseContents(
                'paragraph',
                element.innerHTML,
                'paragraph',
                innerModel.highlightMarkers,
                {
                  topNode: schema.nodes.paragraph.create({
                    contentType: element.getAttribute('content-type'),
                  }),
                }
              ) as ParagraphNode
            )
          })

          const footnote = schema.nodes.footnote.create(
            {
              id: innerModel._id,
              kind: innerModel.kind,
              category: innerModel.category,
            },
            paragraphs
          )
          footnotesOfKind.push(footnote)
        }
      }

      // TODO: footnotesElement doesn't reference footnotes by id, so what happens if one is updated remotely?

      return schema.nodes.footnotes_element.create(
        {
          id: model._id,
          kind: model.collateByKind,
          // placeholder: model.placeholderInnerHTML,
          paragraphStyle: model.paragraphStyle,
        },
        footnotesOfKind
      ) as FootnotesElementNode

      // TODO: collect and add footnotes?
    },
    [ObjectTypes.Footnote]: (data) => {
      const model = data as Footnote

      return schema.nodes.footnote.create({
        id: model._id,
        kind: model.kind,
        // placeholder: model.placeholderText
        // paragraphStyle: model.paragraphStyle,
      }) as FootnoteNode
    },
    [ObjectTypes.KeywordsElement]: (data) => {
      const model = data as KeywordsElement

      return schema.nodes.keywords_element.create({
        id: model._id,
        contents: model.contents
          ? model.contents.replace(/\s+xmlns=".+?"/, '')
          : '',
        paragraphStyle: model.paragraphStyle,
      }) as TOCElementNode
    },
    [ObjectTypes.ListElement]: (data) => {
      const model = data as ListElement

      switch (model.elementType) {
        case 'ol':
          // TODO: wrap inline text in paragraphs
          return this.parseContents(
            'contents',
            model.contents || '<ol></ol>',
            undefined,
            model.highlightMarkers,
            {
              topNode: schema.nodes.ordered_list.create({
                id: model._id,
                paragraphStyle: model.paragraphStyle,
              }),
            }
          ) as OrderedListNode

        case 'ul':
          // TODO: wrap inline text in paragraphs
          return this.parseContents(
            'contents',
            model.contents || '<ul></ul>',
            undefined,
            model.highlightMarkers,
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

      return schema.nodes.listing.createChecked({
        id: model._id,
        contents: model.contents,
        language: model.language,
        languageKey: model.languageKey,
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

      return schema.nodes.listing_element.createChecked(
        {
          id: model._id,
          suppressCaption: model.suppressCaption,
          suppressTitle: Boolean(
            model.suppressTitle === undefined ? true : model.suppressTitle
          ),
        },
        [listing, figcaption]
      ) as ListingElementNode
    },
    [ObjectTypes.ParagraphElement]: (data) => {
      const model = data as ParagraphElement

      return this.parseContents(
        'contents',
        model.contents || '<p></p>',
        undefined,
        model.highlightMarkers,
        {
          topNode: schema.nodes.paragraph.create({
            id: model._id,
            paragraphStyle: model.paragraphStyle,
            placeholder: model.placeholderInnerHTML,
          }),
        }
      ) as ParagraphNode
    },
    [ObjectTypes.QuoteElement]: (data) => {
      const model = data as QuoteElement

      switch (model.quoteType) {
        case 'block':
          return this.parseContents(
            'contents',
            model.contents || '<p></p>',
            undefined,
            model.highlightMarkers,
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
            'contents',
            model.contents || '<p></p>',
            undefined,
            model.highlightMarkers,
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

      const sectionTitleNode: SectionTitleNode = model.title
        ? this.parseContents(
            'title',
            model.title,
            'h1',
            model.highlightMarkers,
            {
              topNode: schema.nodes.section_title.create(),
            }
          )
        : schema.nodes.section_title.create()

      let sectionLabelNode: SectionTitleNode | undefined = undefined
      if (model.label) {
        sectionLabelNode = this.parseContents(
          'label',
          model.label,
          'label',
          model.highlightMarkers,
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

      const content: ManuscriptNode[] = (sectionLabelNode
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

      return this.parseContents(
        'contents',
        model.contents,
        undefined,
        model.highlightMarkers,
        {
          topNode: schema.nodes.table.create({
            id: model._id,
          }),
        }
      ) as TableNode
    },
    [ObjectTypes.TableElement]: (data) => {
      const model = data as TableElement

      const tableModel = this.getModel<Table>(model.containedObjectID)

      let table: TableNode | PlaceholderNode
      if (tableModel) {
        table = this.decode(tableModel) as TableNode
      } else if (this.allowMissingElements) {
        table = schema.nodes.placeholder.create({
          id: model.containedObjectID,
          label: 'A table',
        }) as PlaceholderNode
      } else {
        throw new MissingElement(model.containedObjectID)
      }

      const figcaption: FigCaptionNode = this.getFigcaption(model)

      const content: ManuscriptNode[] = [table, figcaption]

      if (model.listingID) {
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

        content.push(listing)
      } else {
        const listing = schema.nodes.listing.create()
        content.push(listing)
      }

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
  }

  private extractListing(model: FigureElement | MultiGraphicFigureElement) {
    if (model.listingID) {
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
  }
  private extractFigures(model: FigureElement | MultiGraphicFigureElement) {
    const figures: Array<FigureNode | PlaceholderNode> = model
      .containedObjectIDs.length
      ? model.containedObjectIDs.map((id) => {
          if (!id) {
            return schema.nodes.figure.createAndFill() as FigureNode
          }

          const figureModel = this.getModel<Figure>(id)

          if (!figureModel) {
            return schema.nodes.placeholder.create({
              id,
              label: 'A figure',
            }) as PlaceholderNode
          }

          return this.decode(figureModel) as FigureNode
        })
      : [schema.nodes.figure.createAndFill() as FigureNode]
    return figures
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

    return schema.nodes.manuscript.create(
      {
        id: manuscriptID || this.getManuscriptID(),
      },
      rootSectionNodes
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
    field: string,
    contents: string,
    wrapper?: string,
    highlightMarkers: HighlightMarker[] = [],
    options?: ParseOptions
  ): ManuscriptNode => {
    const html = this.extractedHTML(highlightMarkers, field, contents, wrapper)

    const template = document.createElement('template')
    template.innerHTML = html

    if (!template.content.firstChild) {
      throw new Error('No content could be parsed')
    }

    return parser.parse(template.content.firstChild, options)
  }

  private extractedHTML(
    highlightMarkers: HighlightMarker[] | undefined,
    field: string,
    contents: string,
    wrapper: string | undefined
  ) {
    if (!highlightMarkers) {
      return contents
    }
    const contentsWithHighlightMarkers = highlightMarkers.length
      ? insertHighlightMarkers(field, contents, highlightMarkers)
      : contents

    const wrappedContents = wrapper
      ? `<${wrapper}>${contentsWithHighlightMarkers}</${wrapper}>`
      : contentsWithHighlightMarkers

    const html = wrappedContents.trim()

    if (!html.length) {
      throw new Error('No HTML to parse')
    }
    return html
  }

  private getManuscriptID = () => {
    for (const item of this.modelMap.values()) {
      if (isManuscript(item)) {
        return item._id
      }
    }
  }

  private getFigcaption = (
    model:
      | FigureElement
      | TableElement
      | EquationElement
      | ListingElement
      | MultiGraphicFigureElement
  ) => {
    const titleNode = schema.nodes.caption_title.create() as CaptionTitleNode

    const captionTitle = model.title
      ? this.parseContents(
          'title',
          model.title,
          'caption_title',
          model.highlightMarkers,
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
          'caption',
          paragraph.outerHTML,
          'caption',
          model.highlightMarkers,
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
      ? this.parseContents(
          'caption',
          model.caption,
          'caption',
          model.highlightMarkers,
          {
            topNode: captionNode,
          }
        )
      : captionNode

    return schema.nodes.figcaption.create({}, [captionTitle, caption])
  }
}
