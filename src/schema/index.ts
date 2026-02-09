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

import { Schema } from 'prosemirror-model'

import {
  bold,
  code,
  italic,
  smallcaps,
  strikethrough,
  styled,
  subscript,
  superscript,
  tracked_delete,
  tracked_insert,
  underline,
} from './marks'
import { abstracts } from './nodes/abstracts'
import { affiliation } from './nodes/affiliation'
import { affiliations } from './nodes/affiliations'
import { altText } from './nodes/alt_text'
import { altTitle } from './nodes/alt_title'
import { altTitlesSection } from './nodes/alt_titles_section'
import { attachment } from './nodes/attachment'
import { attachments } from './nodes/attachments'
import { attribution } from './nodes/attribution'
import { authorNotes } from './nodes/author_notes'
import { award } from './nodes/award'
import { awards } from './nodes/awards'
import { backmatter } from './nodes/backmatter'
import { bibliographyElement } from './nodes/bibliography_element'
import { bibliographyItem } from './nodes/bibliography_item'
import { bibliographySection } from './nodes/bibliography_section'
import { blockquoteElement } from './nodes/blockquote_element'
import { body } from './nodes/body'
import { box_element } from './nodes/box_element'
import { caption } from './nodes/caption'
import { captionTitle } from './nodes/caption_title'
import { citation } from './nodes/citation'
import { comment } from './nodes/comment'
import { comments } from './nodes/comments'
import { contributor } from './nodes/contributor'
import { contributors } from './nodes/contributors'
import { corresp } from './nodes/corresp'
import { crossReference } from './nodes/cross_reference'
import { doc } from './nodes/doc'
import { embed } from './nodes/embed'
import { equation } from './nodes/equation'
import { equationElement } from './nodes/equation_element'
import { figcaption } from './nodes/figcaption'
import { figure } from './nodes/figure'
import { figureElement } from './nodes/figure_element'
import { footnote } from './nodes/footnote'
import { footnotesElement } from './nodes/footnotes_element'
import { footnotesSection } from './nodes/footnotes_section'
import { generalTableFootnote } from './nodes/general_table_footnote'
import { graphicalAbstractSection } from './nodes/graphical_abstract_section'
import { hardBreak } from './nodes/hard_break'
import { heroImage } from './nodes/hero_image'
import { highlightMarker } from './nodes/highlight_marker'
import { imageElement } from './nodes/image_element'
import { inlineEquation } from './nodes/inline_equation'
import { inlineFootnote } from './nodes/inline_footnote'
import { keyword } from './nodes/keyword'
import { keywordGroup } from './nodes/keyword_group'
import { keywords } from './nodes/keywords'
import { keywordsElement } from './nodes/keywords_element'
import { link } from './nodes/link'
import { list, listItem } from './nodes/list'
import { listing } from './nodes/listing'
import { listingElement } from './nodes/listing_element'
import { longDesc } from './nodes/long_desc'
import { manuscript } from './nodes/manuscript'
import { missingFigure } from './nodes/missing_figure'
import { paragraph } from './nodes/paragraph'
import { placeholder } from './nodes/placeholder'
import { placeholderElement } from './nodes/placeholder_element'
import { pullquoteElement } from './nodes/pullquote_element'
import { quoteImage } from './nodes/quote_image'
import { section } from './nodes/section'
import { sectionLabel } from './nodes/section_label'
import { sectionTitle } from './nodes/section_title'
import { subtitle } from './nodes/subtitle'
import { subtitles } from './nodes/subtitles'
import { supplement } from './nodes/supplement'
import { supplements } from './nodes/supplements'
import { table, tableCell, tableHeader, tableRow } from './nodes/table'
import { tableCol, tableColGroup } from './nodes/table_col'
import { tableElement } from './nodes/table_element'
import { tableElementFooter } from './nodes/table_element_footer'
import { text, textBlock } from './nodes/text'
import { title } from './nodes/title'
import { transAbstract } from './nodes/trans_abstract'
import { transGraphicalAbstract } from './nodes/trans_graphical_abstract'
import { Marks, Nodes } from './types'

export * from './groups'
export * from './nodes/affiliation'
export * from './nodes/affiliations'
export * from './nodes/alt_text'
export * from './nodes/alt_title'
export * from './nodes/alt_titles_section'
export * from './nodes/attachment'
export * from './nodes/attachments'
export * from './nodes/attribution'
export * from './nodes/author_notes'
export * from './nodes/award'
export * from './nodes/awards'
export * from './nodes/bibliography_element'
export * from './nodes/bibliography_item'
export * from './nodes/bibliography_section'
export * from './nodes/blockquote_element'
export * from './nodes/box_element'
export * from './nodes/caption'
export * from './nodes/caption_title'
export * from './nodes/citation'
export * from './nodes/comment'
export * from './nodes/comments'
export * from './nodes/contributor'
export * from './nodes/contributors'
export * from './nodes/corresp'
export * from './nodes/cross_reference'
export * from './nodes/doc'
export * from './nodes/embed'
export * from './nodes/equation'
export * from './nodes/equation_element'
export * from './nodes/figcaption'
export * from './nodes/figure'
export * from './nodes/figure_element'
export * from './nodes/footnote'
export * from './nodes/footnotes_element'
export * from './nodes/footnotes_section'
export * from './nodes/general_table_footnote'
export * from './nodes/graphical_abstract_section'
export * from './nodes/hard_break'
export * from './nodes/hero_image'
export * from './nodes/highlight_marker'
export * from './nodes/image_element'
export * from './nodes/inline_equation'
export * from './nodes/inline_footnote'
export * from './nodes/keyword'
export * from './nodes/keyword_group'
export * from './nodes/keywords'
export * from './nodes/keywords_element'
export * from './nodes/link'
export * from './nodes/list'
export * from './nodes/listing'
export * from './nodes/listing_element'
export * from './nodes/long_desc'
export * from './nodes/manuscript'
export * from './nodes/missing_figure'
export * from './nodes/paragraph'
export * from './nodes/placeholder'
export * from './nodes/placeholder_element'
export * from './nodes/pullquote_element'
export * from './nodes/quote_image'
export * from './nodes/section'
export * from './nodes/section_label'
export * from './nodes/section_title'
export * from './nodes/subtitle'
export * from './nodes/subtitles'
export * from './nodes/supplement'
export * from './nodes/supplements'
export * from './nodes/table'
export * from './nodes/table_col'
export * from './nodes/table_element'
export * from './nodes/table_element_footer'
export * from './nodes/text'
export * from './nodes/title'
export * from './nodes/trans_abstract'
export * from './nodes/trans_graphical_abstract'
export * from './types'
export const schema = new Schema<Nodes, Marks>({
  marks: {
    bold,
    code,
    italic,
    smallcaps,
    strikethrough,
    styled,
    subscript,
    superscript,
    underline,
    tracked_insert,
    tracked_delete,
  },
  nodes: {
    comment,
    comments,
    attribution,
    bibliography_item: bibliographyItem,
    bibliography_element: bibliographyElement,
    bibliography_section: bibliographySection,
    blockquote_element: blockquoteElement,
    list: list,
    caption,
    caption_title: captionTitle,
    citation,
    abstracts,
    body,
    backmatter,
    cross_reference: crossReference,
    doc,
    equation,
    equation_element: equationElement,
    figcaption,
    figure,
    figure_element: figureElement,
    footnote,
    footnotes_element: footnotesElement,
    footnotes_section: footnotesSection,
    general_table_footnote: generalTableFootnote,
    graphical_abstract_section: graphicalAbstractSection,
    hard_break: hardBreak,
    highlight_marker: highlightMarker,
    inline_equation: inlineEquation,
    inline_footnote: inlineFootnote,
    keyword,
    keywords_element: keywordsElement,
    keywords: keywords,
    keyword_group: keywordGroup,
    link,
    list_item: listItem,
    listing,
    listing_element: listingElement,
    manuscript,
    missing_figure: missingFigure,
    paragraph,
    placeholder,
    placeholder_element: placeholderElement,
    pullquote_element: pullquoteElement,
    section,
    section_label: sectionLabel,
    section_title: sectionTitle,
    section_title_plain: sectionTitle, // used for non-editable titles
    table,
    table_cell: tableCell,
    table_element: tableElement,
    table_row: tableRow,
    table_col: tableCol,
    table_colgroup: tableColGroup,
    table_header: tableHeader,
    text,
    text_block: textBlock,
    affiliation,
    contributor: contributor,
    table_element_footer: tableElementFooter,
    title,
    affiliations,
    contributors,
    supplements,
    supplement,
    author_notes: authorNotes,
    corresp,
    box_element,
    awards,
    award,
    embed,
    image_element: imageElement,
    attachment,
    attachments,
    alt_title: altTitle,
    alt_titles: altTitlesSection,
    alt_text: altText,
    long_desc: longDesc,
    quote_image: quoteImage,
    hero_image: heroImage,
    trans_abstract: transAbstract,
    trans_graphical_abstract: transGraphicalAbstract,
    subtitle: subtitle,
    subtitles: subtitles,
  },
})
