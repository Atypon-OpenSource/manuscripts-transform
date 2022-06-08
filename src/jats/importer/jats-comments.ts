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

import { CommentAnnotation, Model } from '@manuscripts/manuscripts-json-schema'
import { v4 as uuidv4 } from 'uuid'

import {
  Build,
  buildComment,
  buildContribution,
} from '../../transformer/builders'
import {
  HighlightableField,
  HighlightableModel,
  isHighlightableModel,
} from '../../transformer/highlight-markers'
import { isCommentAnnotation } from '../../transformer/object-types'

type ProcessingInstruction = { id: string; queryText: string }

const DEFAULT_ANNOTATION_COLOR = 'rgb(250, 224, 150)'
const DEFAULT_PROFILE_ID =
  'MPUserProfile:0000000000000000000000000000000000000001'

export const parseProcessingInstruction = (
  node: Node
): ProcessingInstruction | undefined => {
  const value = `<AuthorQuery ${node.textContent} />`
  const processingInstruction = new DOMParser().parseFromString(
    value,
    'application/xml'
  ).firstElementChild
  if (processingInstruction) {
    const queryText = processingInstruction.getAttribute('queryText')
    const id = processingInstruction.getAttribute('id')
    if (queryText && id) {
      return { queryText, id }
    }
  }
}

/**
 * Replaces processing instructions with tokens
 */
export const markProcessingInstructions = (
  doc: Document
): Map<string, string> => {
  const authorQueriesMap = new Map<string, string>()
  const root = doc.getRootNode()
  const queue: Array<Node> = [root]
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      const { nodeType, nodeName } = node
      if (
        nodeType === node.PROCESSING_INSTRUCTION_NODE &&
        nodeName === 'AuthorQuery'
      ) {
        // Node inserted to parent no need to shift
        insertToken(doc, node, authorQueriesMap)
      }
      node.childNodes.forEach((child) => {
        queue.push(child)
      })
    }
  }
  return authorQueriesMap
}

const insertToken = (
  doc: Document,
  processingInstructionNode: Node,
  authorQueriesMap: Map<string, string>
) => {
  const instruction = parseProcessingInstruction(processingInstructionNode)
  const { parentElement } = processingInstructionNode
  if (parentElement && instruction) {
    const { queryText } = instruction
    const token = uuidv4()
    const tokenNode = doc.createTextNode(token)
    authorQueriesMap.set(token, queryText)
    return parentElement.insertBefore(tokenNode, processingInstructionNode)
  }
}

export const createComments = (
  authorQueriesMap: Map<string, string>,
  manuscriptModels: Array<Model>
): Build<CommentAnnotation>[] => {
  const tokens = [...authorQueriesMap.keys()]
  const commentAnnotations: Build<CommentAnnotation>[] = []
  for (const model of manuscriptModels) {
    if (isHighlightableModel(model)) {
      const comments = addCommentsFromMarkedProcessingInstructions(
        tokens,
        model,
        authorQueriesMap
      )
      commentAnnotations.push(...comments)
    }
  }

  return commentAnnotations
}

/**
 * Creates CommentAnnotations from marked processing instructions in model
 */
const addCommentsFromMarkedProcessingInstructions = (
  tokens: string[],
  model: HighlightableModel,
  authorQueriesMap: Map<string, string>
): Build<CommentAnnotation>[] => {
  const commentAnnotations: Build<CommentAnnotation>[] = []
  // Search for tokens on every HighlightableField
  for (const field of ['contents', 'caption', 'title']) {
    const highlightableField = field as HighlightableField
    const content = model[highlightableField]
    if (!content) {
      continue
    }
    // Tokens need to be removed in the order they appear in the text to keep valid indices of selectors
    const sortedTokens = tokens
      .filter((token) => content.indexOf(token) >= 0)
      .sort((a, b) => content.indexOf(a) - content.indexOf(b))

    let contentWithoutTokens = content
    for (const token of sortedTokens) {
      const query = authorQueriesMap.get(token)
      if (query) {
        const text = textFromHTML(contentWithoutTokens)
        // Remove extra spaces -if exist- from the start of each line of the text content. I decided to do this after I noticed that the bibliography element content contains extra spaces at the start of each line (reference). Not sure why!
        const trimmedTextContent = text ? text.replace(/^\s+/gm, '') : undefined

        const startTokenIndex = trimmedTextContent
          ? trimmedTextContent.indexOf(token)
          : undefined

        // Remove the token
        contentWithoutTokens = contentWithoutTokens.replace(token, '')
        // Add the comment
        const comment = `${query}`
        const target =
          model._id && !isCommentAnnotation(model) ? model._id : uuidv4()
        const contributions = [buildContribution(DEFAULT_PROFILE_ID)]
        const selector = startTokenIndex
          ? { from: startTokenIndex, to: startTokenIndex }
          : undefined
        const commentAnnotation = buildComment(
          target,
          comment,
          selector,
          contributions,
          DEFAULT_ANNOTATION_COLOR
        )
        commentAnnotations.push(commentAnnotation)
      }
    }
    // Re-assign content after removing the tokens
    model[highlightableField] = contentWithoutTokens
  }

  return commentAnnotations
}

const textFromHTML = (html: string) => {
  const template = document.createElement('template')
  template.innerHTML = html
  // Given that citation nodes are not selectable (not counted), we replaced it's content with one character i.e (1) to give more accurate position.
  for (const xref of template.content.querySelectorAll('.citation')) {
    xref.textContent = '1'
  }
  return template.content.textContent
}
