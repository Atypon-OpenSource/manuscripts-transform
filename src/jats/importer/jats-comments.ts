/*!
 * © 2020 Atypon Systems LLC
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

import { v4 as uuid } from 'uuid'

import { schema } from '../../schema'
import { generateNodeID } from '../../transformer'

export const DEFAULT_PROFILE_ID =
  'MPUserProfile:0000000000000000000000000000000000000001'

const isJATSComment = (node: Node) => {
  return (
    node.nodeType === node.PROCESSING_INSTRUCTION_NODE &&
    node.nodeName === 'AuthorQuery'
  )
}

const parseJATSComment = (node: Node): string | undefined => {
  const text = node.textContent
  if (text) {
    const queryText = /queryText="(.+)"/.exec(text)
    return (queryText && queryText[1]) || undefined
  }
}

const isHighlightable = (node: Element) => {
  //todo find a better way to do this
  return node.nodeName === 'p'
}

const findTarget = (node: Element) => {
  const target = node.closest('ref, kwd-group')
  if (target) {
    return target
  }
  return node
}

export const markComments = (doc: Document) => {
  const root = doc.getRootNode() as Element
  const queue: Element[] = [root]
  const comments = doc.createElement('comments')
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      if (isJATSComment(node)) {
        const text = parseJATSComment(node)
        if (text) {
          const id = generateNodeID(schema.nodes.comment)
          let target
          const parent = node.parentNode as Element
          if (isHighlightable(parent)) {
            const marker = createHighlightMarkerElement(doc, id)
            parent.insertBefore(marker, node)
            target = parent
          } else {
            target = findTarget(parent)
          }
          // if the target has no ID, generate one here and rely on
          // updateDocumentIDs to fix it
          if (!target.id) {
            target.id = uuid()
          }
          const comment = createCommentElement(doc, id, target.id, text)
          comments.appendChild(comment)
        }
      }
      node.childNodes.forEach((child) => {
        queue.push(child as Element)
      })
    }
  }

  doc.documentElement.appendChild(comments)
}

const createHighlightMarkerElement = (doc: Document, id: string) => {
  const highlightMarker = doc.createElement('highlight-marker')
  highlightMarker.setAttribute('id', id)
  highlightMarker.setAttribute('position', 'point')
  return highlightMarker
}

const createCommentElement = (
  doc: Document,
  id: string,
  targetID: string | undefined,
  text: string
) => {
  const commentElement = doc.createElement('comment')
  commentElement.setAttribute('id', id)
  if (targetID) {
    commentElement.setAttribute('target-id', targetID)
  }
  commentElement.textContent = text
  return commentElement
}
