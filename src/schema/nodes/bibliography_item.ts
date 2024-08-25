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

interface Attrs {
  id: string
  type: string
  author?: BibliographicName[]
  issued?: BibliographicDate
  containerTitle?: string
  doi?: string
  volume?: string
  issue?: string
  supplement?: string
  page?: string
  title?: string
  literal?: string
  paragraphStyle: string
}

export interface BibliographyItemNode extends ManuscriptNode {
  attrs: Attrs
}

export const bibliographyItem: NodeSpec = {
  // this is to help the prosemirror decoration to reach HTML of this node
  content: 'inline{0}',
  attrs: {
    id: { default: '' },
    type: { default: undefined },
    author: { default: undefined },
    issued: { default: undefined },
    containerTitle: { default: undefined },
    doi: { default: undefined },
    volume: { default: undefined },
    issue: { default: undefined },
    supplement: { default: undefined },
    page: { default: undefined },
    title: { default: undefined },
    literal: { default: undefined },
    paragraphStyle: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block',
}
