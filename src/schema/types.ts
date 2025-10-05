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
  Node as ProsemirrorNode,
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

import { BibliographicName } from './nodes/contributor'

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
  | 'doc'
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
  | 'trans_abstract'
  | 'subtitle'
  | 'subtitles'

export type ManuscriptSchema = Schema<Nodes, Marks>

export type ManuscriptEditorState = EditorState
export type ManuscriptEditorView = EditorView
export type ManuscriptFragment = Fragment
export type ManuscriptMark = ProsemirrorMark
export type ManuscriptNode = ProsemirrorNode
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
  articleType: string
  hiddenNodeTypes?: string[]
}

export interface UserProfile {
  _id: string
  objectType: 'MPUserProfile'
  updatedAt: number
  userID: string
  bibliographicName: BibliographicName
  role?: string
  isMe?: boolean
  isJointContributor?: boolean
  isCorresponding?: boolean
  contribution?: string
  placeholderString?: string
  appInvitationDate?: number
  addressBookIDs?: string[]
  email?: string
}

export interface Project {
  _id: string
  objectType: 'MPProject'
  title?: string
  templateContainer?: boolean
  owners: string[]
  writers: string[]
  editors?: string[]
  annotators?: string[]
  proofers?: string[]
  viewers: string[]
  assignees?: string[]
  deadline?: number
  priority?: number
  status?: string
}

export interface Journal {
  _id: string
  objectType: 'MPJournal'
  title?: string
  publisherName?: string
  submittable?: boolean
  ISSNs?: Array<{
    ISSN: string
    publicationType?: string
  }>
  abbreviatedTitles?: Array<{
    abbreviatedTitle: string
    abbrevType?: string
  }>
  journalIdentifiers?: Array<{
    journalID: string
    journalIDType?: string
  }>
  owners?: string[]
  writers?: string[]
  editors?: string[]
  annotators?: string[]
  proofers?: string[]
  viewers?: string[]
}

export interface Bundle {
  _id: string
  objectType: 'MPBundle'
  containerID: string
  csl?: {
    'author-name'?: string
    'author-email'?: string
    'author-uri'?: string
    'template-URL'?: string
    summary?: string
    version?: string
    defaultLocale?: string
    title?: string
    cslIdentifier?: string
    'self-URL'?: string
    'independent-parent-URL'?: string
    'documentation-URL'?: string
    fields?: string[]
    ISSNs?: string[]
    eISSNs?: string[]
    updatedAt?: number
    _id?: string
  }
}

export interface Manuscript {
  _id: string
  objectType: 'MPManuscript'
  containerID: string
  DOI?: string
  articleType: string
  prototype: string
  primaryLanguageCode: string
}

export type MarkRule = ParseRule & { mark: Marks | null }

export type NodeRule = ParseRule & { node?: Nodes | null }

export function isNodeOfType<T extends ManuscriptNode>(
  node: ManuscriptNode,
  type: NodeType
): node is T {
  return node.type === type
}
