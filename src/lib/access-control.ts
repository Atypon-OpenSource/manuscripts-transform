/*!
 * © 2026 Atypon Systems LLC
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
import { NodeType } from 'prosemirror-model'

import { CommentNode, ManuscriptActions, ManuscriptNode } from '../schema'

/**
 * Attribute-Based Access Control polices for manuscript nodes.
 * used by manuscript-api to evaluate incoming ProseMirror steps against these policies.
 */

export type NodeAccessSubject = {
  userId: string
  actions: Record<ManuscriptActions, boolean>
}

/** Nodes with restricted access */
type ProtectedResources = {
  comment: CommentNode
}

/** A rule that evaluates whether a subject can perform an operation on a specific node */
type NodeRule<T extends ManuscriptNode> = (
  node: T,
  subject: NodeAccessSubject
) => boolean

/** Policy for a single node type */
type NodePolicy<T extends ManuscriptNode> = {
  /** can subject add this node */
  insert?: NodeRule<T>
  /** can subject delete this node */
  delete?: NodeRule<T>
  /** can subject modify attributes:
   *  - As an object per-attribute rules
   *  - As a function one rule applied to all attribute changes*/
  attrs?: Partial<Record<keyof T['attrs'], NodeRule<T>>> | NodeRule<T>
}

type NodesPolicy = {
  [K in keyof ProtectedResources]?: NodePolicy<ProtectedResources[K]>
}

const nodesPolicy: NodesPolicy = {
  comment: {
    insert: (_, subject) => subject.actions.createComment,
    delete: (node, subject) => {
      const isOwn = node.attrs.userID === subject.userId
      return isOwn
        ? subject.actions.handleOwnComments
        : subject.actions.handleOthersComments
    },
    attrs: {
      contents: (node, subject) => {
        const isOwn = node.attrs.userID === subject.userId
        return isOwn
          ? subject.actions.handleOwnComments
          : subject.actions.handleOthersComments
      },
      resolved: (node, subject) => {
        const isOwn = node.attrs.userID === subject.userId
        return isOwn
          ? subject.actions.resolveOwnComment
          : subject.actions.resolveOthersComment
      },
    },
  },
}

export function getNodeAccessPolicy(nodeType: NodeType) {
  if (nodeType.name in nodesPolicy) {
    return nodesPolicy[
      nodeType.name as keyof NodesPolicy
    ] as NodePolicy<ManuscriptNode>
  }
}
