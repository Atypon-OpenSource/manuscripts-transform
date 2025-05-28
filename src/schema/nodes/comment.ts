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

import { buildContribution, Contribution } from '@manuscripts/json-schema'
import { Node, NodeSpec } from 'prosemirror-model'

import { getTrimmedTextContent } from '../utills'

const DEFAULT_PROFILE_ID =
  'MPUserProfile:0000000000000000000000000000000000000001'

export interface CommentAttrs {
  id: string
  contents: string
  target: string
  selector: { from: number; to: number }
  resolved?: boolean
  contributions?: Contribution[]
  originalText?: string
}

export interface CommentNode extends Node {
  attrs: CommentAttrs
}

export const comment: NodeSpec = {
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    target: { default: '' },
    selector: { default: undefined },
    resolved: { default: false },
    contributions: { default: [] },
    originalText: { default: '' },
  },
  parseDOM: [
    {
      tag: 'comment',
      getAttrs: (node) => {
        const element = node as HTMLElement
        return {
          id: element.getAttribute('id'),
          target: element.getAttribute('target-id'),
          contents: getTrimmedTextContent(element),
          contributions: [buildContribution(DEFAULT_PROFILE_ID)],
        }
      },
    },
  ],
}

export const isCommentNode = (node: Node): node is CommentNode =>
  node.type === node.type.schema.nodes.comment
