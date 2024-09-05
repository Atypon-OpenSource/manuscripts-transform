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

import { ObjectTypes } from '@manuscripts/json-schema'

import { generateID } from '../../transformer'

export type JATSComment = {
  index: number
  text: string
  id: string
}

export const DEFAULT_PROFILE_ID =
  'MPUserProfile:0000000000000000000000000000000000000001'

export const isJATSComment = (node: Node) => {
  return (
    node.nodeType === node.PROCESSING_INSTRUCTION_NODE &&
    node.nodeName === 'AuthorQuery'
  )
}

export const parseJATSComment = (node: Node): JATSComment | undefined => {
  const text = node.textContent
  if (text) {
    const queryText = /queryText="(.+)"/.exec(text)
    if (queryText) {
      const parentNode = node.parentNode as Element
      const index = parentNode.outerHTML.indexOf(queryText[1])
      return {
        id: generateID(ObjectTypes.CommentAnnotation),
        text: queryText[1],
        index,
      }
    }
  }
}

export const markComments = (doc: Document) => {
  const root = doc.getRootNode()
  const queue: Node[] = [root]
  const commentsElement = doc.createElement('comments-annotations')
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      if (isJATSComment(node)) {
        const comment = parseJATSComment(node)
        if (comment) {
          const highlightMarker = createHighlightMarkerElement(doc, comment.id)
          node.parentNode?.insertBefore(highlightMarker, node)
          const commentElement = createCommentElement(doc, comment)
          commentsElement.appendChild(commentElement)
        }
      }
      node.childNodes.forEach((child) => {
        queue.push(child)
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

const createCommentElement = (doc: Document, comment: JATSComment) => {
  const commentElement = doc.createElement('comment-annotation')
  commentElement.setAttribute('id', comment.id)
  commentElement.textContent = comment.text
  if (comment.index !== -1) {
    commentElement.setAttribute('from', comment.index.toString())
    commentElement.setAttribute('to', comment.index.toString())
  }
  return commentElement
}
