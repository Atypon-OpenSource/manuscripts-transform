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

export interface CommentAttrs {
  id: string
  contents: string
  target: string
  selector: { from: number; to: number }
  resolved?: boolean
  contributions?: {
    _id: string
    objectType: 'MPContribution'
    profileID: string
    timestamp: number
  }[]
  originalText?: string
}

export interface CommentNode extends ManuscriptNode {
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
}

export const isCommentNode = (node: ManuscriptNode): node is CommentNode =>
  node.type === node.type.schema.nodes.comment
