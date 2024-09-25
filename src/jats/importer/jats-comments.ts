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

export const markComments = (doc: Document) => {
  const root = doc.getRootNode() as Element
  const queue: Element[] = [root]
  const commentsElement = doc.createElement('comments')
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      if (isJATSComment(node)) {
        const text = parseJATSComment(node)
        if (text) {
          const id = generateNodeID(schema.nodes.comment)
          const parent = node.parentNode as Element
          if (parent) {
            //todo check if node is highlightable?
            //if (isHighlightable()) {
            const marker = createHighlightMarkerElement(doc, id)
            parent.insertBefore(marker, node)
            //}
            const targetID = parent.id
            const commentElement = createCommentElement(doc, id, targetID, text)
            commentsElement.appendChild(commentElement)
          }
        }
      }
      node.childNodes.forEach((child) => {
        queue.push(child as Element)
      })
    }
  }

  if (commentsElement.hasChildNodes()) {
    doc.documentElement.appendChild(commentsElement)
  }
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
