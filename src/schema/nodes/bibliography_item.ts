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

export type BibliographyItemAttr = {
  type?: string
  content?: string
}

export interface BibliographyItemAttrs {
  id: string
  type: string
  authors?: BibliographicName[]
  issued?: BibliographicDate
  containerTitle?: string
  volume?: string
  issue?: string
  supplement?: string
  page?: string
  title?: string
  literal?: string
  dataTitle?: string
  std?: string
  series?: string
  edition?: string
  publisherLoc?: string
  publisherName?: string
  confName?: string
  confLoc?: string
  confDate?: string
  institution?: string
  editors?: BibliographicName[]
  elocationID?: string
  links?: BibliographyItemAttr[]
  size?: string
  dateInCitation?: string
  pubIDs?: BibliographyItemAttr[]
}

export type BibliographyItemType =
  | 'journal'
  | 'book'
  | 'book-chapter'
  | 'confproc'
  | 'thesis'
  | 'web'
  | 'other'
  | 'standard'
  | 'data'
  | 'preprint'

export interface BibliographyItemNode extends ManuscriptNode {
  attrs: BibliographyItemAttrs
}

export const bibliographyItem: NodeSpec = {
  // this is to help the prosemirror decoration to reach HTML of this node
  content: 'inline{0}',
  attrs: {
    id: { default: '' },
    type: { default: undefined },
    authors: { default: undefined },
    issued: { default: undefined },
    containerTitle: { default: undefined },
    volume: { default: undefined },
    issue: { default: undefined },
    supplement: { default: undefined },
    page: { default: undefined },
    title: { default: undefined },
    literal: { default: undefined },
    dataTitle: { default: undefined },
    std: { default: undefined },
    series: { default: undefined },
    edition: { default: undefined },
    publisherLoc: { default: undefined },
    publisherName: { default: undefined },
    confName: { default: undefined },
    confLoc: { default: undefined },
    confDate: { default: undefined },
    institution: { default: undefined },
    editors: { default: undefined },
    elocationID: { default: undefined },
    links: { default: undefined },
    size: { default: undefined },
    pubIDs: { default: undefined },
    dateInCitation: { default: undefined },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
}
