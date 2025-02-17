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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'

export interface ActualManuscriptNode extends ManuscriptNode {
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

// The direct children of this node do not have a json-schema representation
// They exist for the purpose of styling in the UI

export const manuscript: NodeSpec = {
  content:
    'title? contributors? affiliations? author_notes? awards? keywords? supplements? abstracts body backmatter comments attachments?',
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
      getAttrs: (p) => {
        const dom = p as HTMLElement

        return {
          id: dom.getAttribute('id'),
        }
      },
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

export const isManuscriptNode = (
  node: ManuscriptNode
): node is ManuscriptNode => node.type === node.type.schema.nodes.manuscript
