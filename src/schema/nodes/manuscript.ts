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

import { Node, NodeSpec } from 'prosemirror-model'

import { dateToTimestamp, getTrimmedTextContent } from '../utills'

export interface ActualManuscriptNode extends Node {
  attrs: ManuscriptAttrs
}

export interface ManuscriptAttrs {
  id: string
  doi: string
  articleType: string
  prototype: string
  primaryLanguageCode: string
  acceptanceDate?: number
  correctionDate?: number
  retractionDate?: number
  revisionRequestDate?: number
  revisionReceiveDate?: number
  receiveDate?: number
}

const parseHistoryDates = (historyNode: Element | null) => {
  if (!historyNode) {
    return undefined
  }
  const history: {
    acceptanceDate?: number
    correctionDate?: number
    retractionDate?: number
    revisionRequestDate?: number
    revisionReceiveDate?: number
    receiveDate?: number
  } = {}

  for (const date of historyNode.children) {
    const dateType = date.getAttribute('date-type')
    switch (dateType) {
      case 'received': {
        history.receiveDate = dateToTimestamp(date)
        break
      }
      case 'rev-recd': {
        history.revisionReceiveDate = dateToTimestamp(date)
        break
      }
      case 'accepted': {
        history.acceptanceDate = dateToTimestamp(date)
        break
      }
      case 'rev-request': {
        history.revisionRequestDate = dateToTimestamp(date)
        break
      }
      case 'retracted': {
        history.retractionDate = dateToTimestamp(date)
        break
      }
      case 'corrected': {
        history.correctionDate = dateToTimestamp(date)
        break
      }
    }
  }
  return history
}
// The direct children of this node do not have a json-schema representation
// They exist for the purpose of styling in the UI

export const manuscript: NodeSpec = {
  content:
    'title alt_titles? contributors? affiliations? author_notes? awards? keywords? supplements? abstracts body backmatter hero_image? comments attachments?',
  attrs: {
    id: { default: '' },
    doi: { default: '' },
    prototype: { default: '' },
    primaryLanguageCode: { default: '' },
    articleType: { default: '' },
    acceptanceDate: { default: undefined },
    correctionDate: { default: undefined },
    retractionDate: { default: undefined },
    revisionRequestDate: { default: undefined },
    revisionReceiveDate: { default: undefined },
    receiveDate: { default: undefined },
  },
  group: 'block',
  parseDOM: [
    {
      tag: 'article',
      getAttrs: (node) => {
        const element = node as HTMLElement
        const doi = element.querySelector(
          'front > article-meta > article-id[pub-id-type="doi"]'
        )
        const history = element.querySelector('history')
        const dates = parseHistoryDates(history)
        return {
          id: element.getAttribute('id'),
          doi: getTrimmedTextContent(doi),
          articleType: element.getAttribute('article-type') ?? '',
          primaryLanguageCode: element.getAttribute('lang') ?? '',
          ...dates,
        }
      },
    },
    {
      tag: 'front',
      ignore: true,
    },
    {
      tag: 'back',
      ignore: true,
    },
    {
      tag: 'history',
      ignore: true,
    },

    {
      tag: 'label',
      ignore: true,
    },
  ],
  toDOM: (node) => {
    const manuscriptNode = node as ActualManuscriptNode

    return [
      'article',
      {
        id: manuscriptNode.attrs.id,
      },
      0,
    ]
  },
}

export const isManuscriptNode = (node: Node): node is ActualManuscriptNode =>
  node.type === node.type.schema.nodes.manuscript
