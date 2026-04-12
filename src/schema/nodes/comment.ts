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

import {ManuscriptNode, NodeAccessPolicy} from '../types'

export interface CommentAttrs {
  id: string
  contents: string
  target: string
  selector: { from: number; to: number }
  resolved?: boolean
  userID: string
  timestamp: number
  originalText?: string
}

export interface CommentNode extends ManuscriptNode {
  attrs: CommentAttrs
}

export const comment: NodeSpec & NodeAccessPolicy = {
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    target: { default: '' },
    selector: { default: undefined },
    resolved: { default: false },
    userID: { default: '' },
    timestamp: { default: 0 },
    originalText: { default: '' },
  },
  canInsertNode(_, context) {
    return context.capabilities.createComment
  },
  canDeleteNode(node, context) {
    const isOwn = node.attrs.userID === context.userId
    return isOwn ? context.capabilities.handleOwnComments
      : context.capabilities.handleOthersComments
  },
  canEditAttr(node, attr, context): boolean {
    const isOwn = node.attrs.userID === context.userId

    if (attr === 'contents') {
      return isOwn
        ? context.capabilities.handleOwnComments
        : context.capabilities.handleOthersComments
    } else if (attr === 'resolved') {
      return isOwn
        ? context.capabilities.resolveOwnComment
        : context.capabilities.resolveOthersComment
    }
    return false
  }
}

export const isCommentNode = (node: ManuscriptNode): node is CommentNode =>
  node.type === node.type.schema.nodes.comment
