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
  Fragment,
  Mark as ProsemirrorMark,
  MarkType,
  Node,
  NodeSpec,
  NodeType,
  ParseRule,
  ResolvedPos,
  Schema,
  Slice,
} from 'prosemirror-model'
import {
  EditorState,
  NodeSelection,
  Plugin,
  TextSelection,
  Transaction,
} from 'prosemirror-state'
import { EditorView, NodeView } from 'prosemirror-view'

export type Marks =
  | 'bold'
  | 'code'
  | 'italic'
  | 'smallcaps'
  | 'strikethrough'
  | 'styled'
  | 'subscript'
  | 'superscript'
  | 'underline'
  | 'tracked_insert'
  | 'tracked_delete'

export type Nodes =
  | 'attribution'
  | 'bibliography_item'
  | 'bibliography_element'
  | 'bibliography_section'
  | 'blockquote_element'
  | 'quote_image'
  | 'list'
  | 'caption'
  | 'caption_title'
  | 'comment'
  | 'comments'
  | 'citation'
  | 'cross_reference'
  | 'equation'
  | 'equation_element'
  | 'figcaption'
  | 'figure'
  | 'graphical_abstract_section'
  | 'figure_element'
  | 'footnote'
  | 'footnotes_element'
  | 'footnotes_section'
  | 'hard_break'
  | 'highlight_marker'
  | 'inline_equation'
  | 'inline_footnote'
  | 'keyword'
  | 'keywords_element'
  | 'keyword_group'
  | 'keywords'
  | 'link'
  | 'list_item'
  | 'listing'
  | 'listing_element'
  | 'manuscript'
  | 'abstracts'
  | 'body'
  | 'backmatter'
  | 'missing_figure'
  | 'paragraph'
  | 'placeholder'
  | 'placeholder_element'
  | 'pullquote_element'
  | 'section'
  | 'section_label'
  | 'section_title'
  | 'section_title_plain'
  | 'table'
  | 'table_cell'
  | 'table_element'
  | 'table_row'
  | 'table_colgroup'
  | 'table_col'
  | 'table_header'
  | 'text'
  | 'text_block'
  | 'affiliation'
  | 'contributor'
  | 'table_element_footer'
  | 'title'
  | 'affiliations'
  | 'contributors'
  | 'supplements'
  | 'supplement'
  | 'author_notes'
  | 'corresp'
  | 'general_table_footnote'
  | 'box_element'
  | 'awards'
  | 'award'
  | 'embed'
  | 'image_element'
  | 'attachment'
  | 'attachments'
  | 'alt_title'
  | 'alt_text'
  | 'alt_titles'
  | 'long_desc'
  | 'hero_image'

export type ManuscriptSchema = Schema<Nodes, Marks>

export type ManuscriptEditorState = EditorState
export type ManuscriptEditorView = EditorView
export type ManuscriptFragment = Fragment
export type ManuscriptMark = ProsemirrorMark
export type ManuscriptNodeSelection = NodeSelection
export type ManuscriptTextSelection = TextSelection
export type ManuscriptMarkType = MarkType
export type ManuscriptNodeType = NodeType
export type ManuscriptNodeView = NodeView
export type ManuscriptResolvedPos = ResolvedPos
export type ManuscriptPlugin = Plugin
export type ManuscriptSlice = Slice
export type ManuscriptTransaction = Transaction

export interface TableNodeSpec extends NodeSpec {
  tableRole: string
}

export type DataTrackedAttrs = {
  id: string
  status: string
  operation: string
  userID: string
  createdAt: number
}

export type SectionGroup =
  | 'abstracts'
  | 'body'
  | 'backmatter'
  | 'abstracts-graphic'

export type SectionCategory = {
  id: string
  synonyms: string[]
  titles: [string, ...string[]]
  group?: SectionGroup
  isUnique: boolean
}

export type ManuscriptTemplate = {
  _id: string
  bundle: string
  title: string
  sectionCategories: SectionCategory[]
}

export type MarkRule = ParseRule & { mark: Marks | null }

export type NodeRule = ParseRule & { node?: Nodes | null }

export function isNodeOfType<T extends Node>(
  node: Node,
  type: NodeType
): node is T {
  return node.type === type
}
