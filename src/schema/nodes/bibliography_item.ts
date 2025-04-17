/*!
 * © 2022 Atypon Systems LLC
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

import { BibliographicDate, BibliographicName } from '@manuscripts/json-schema'
import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

export interface BibliographyItemAttrs {
  id: string
  type: string
  author?: BibliographicName[]
  issued?: BibliographicDate
  'container-title'?: string
  volume?: string
  issue?: string
  supplement?: string
  page?: string
  title?: string
  literal?: string
  std?: string
  'collection-title'?: string
  edition?: string
  'publisher-place'?: string
  publisher?: string
  event?: string
  'event-place'?: string
  'event-date'?: BibliographicDate
  institution?: string
  editor?: BibliographicName[]
  elocationID?: string
  URL?: string
  'number-of-pages'?: string
  accessed?: BibliographicDate // date-in-citation
  DOI?: string
}
export type BibliographyItemType =
  | 'article-journal' //journal
  | 'book'
  | 'chapter'
  | 'conf-proc'
  | 'thesis'
  | 'webpage' //web
  | 'other' // no match
  | 'standard' // no match
  | 'dataset' // data
  | 'preprint' // no match

export const publicationTypeToPM: Record<string, string> = {
  journal: 'article-journal',
  web: 'webpage',
  data: 'dataset',
  preprint: 'article-journal',
}

export interface BibliographyItemNode extends ManuscriptNode {
  attrs: BibliographyItemAttrs
}

export const bibliographyItem: NodeSpec = {
  // this is to help the prosemirror decoration to reach HTML of this node
  content: 'inline{0}',
  attrs: {
    id: { default: '' },
    type: { default: undefined },
    author: { default: undefined },
    DOI: { default: undefined },
    issued: { default: undefined },
    'container-title': { default: undefined },
    volume: { default: undefined },
    issue: { default: undefined },
    supplement: { default: undefined },
    page: { default: undefined },
    title: { default: undefined },
    literal: { default: undefined },
    std: { default: undefined },
    'collection-title': { default: undefined },
    edition: { default: undefined },
    publisher: { default: undefined }, //publisher-name
    'publisher-place': { default: undefined }, //publisher-loc
    event: { default: undefined }, //conf-name
    'event-place': { default: undefined }, //conf-loc
    'event-date': { default: undefined }, //conf-date
    institution: { default: undefined },
    editor: { default: undefined },
    elocationID: { default: undefined },
    'number-of-pages': { default: undefined }, //size @unit=pages
    pubIDs: { default: undefined },
    accessed: { default: undefined },
    URL: { default: undefined },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
}
