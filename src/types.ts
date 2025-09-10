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

export type JSONProsemirrorNode = {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs: { [key: string]: any }
  content?: JSONProsemirrorNode[]
  text?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
}

export interface Model {
  _id: string
  objectType: string
  createdAt: number
  updatedAt: number
  prototype?: string
}

export interface UserProfile extends Model {
  objectType: 'MPUserProfile'
  userID: string
  role?: string
  isMe?: boolean
  isJointContributor?: boolean
  isCorresponding?: boolean
  contribution?: string
  placeholderString?: string
  appInvitationDate?: number
  addressBookIDs?: string[]
  bibliographicName?: {
    _id: string
    objectType: string
    family?: string
    given?: string
    'dropping-particle'?: string
    'non-dropping-particle'?: string
    suffix?: string
    literal?: string
  }
}

export interface Project extends Model {
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

export interface Journal extends Model {
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

export interface Bundle extends Model {
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
  }
}

export const objectTypes = {
  Project: 'MPProject',
  Manuscript: 'MPManuscript',
  Journal: 'MPJournal',
  UserProfile: 'MPUserProfile',
  BibliographicName: 'MPBibliographicName',
  BibliographicDate: 'MPBibliographicDate',
  Bundle: 'MPBundle',
  BibliographyItem: 'MPBibliographyItem',
  Citation: 'MPCitation',
  CitationItem: 'MPCitationItem',
}
