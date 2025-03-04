/*!
 * © 2025 Atypon Systems LLC
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
import { Node, NodeType } from 'prosemirror-model'
import { findChildrenByType } from 'prosemirror-utils'

import { TitleNode } from '../schema'

export interface ValidationError {
  code: string
  id?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export const VALIDATION_ERROR_CODES = {
  EMPTY_TITLE: 'EMPTY_TITLE',
} as const

const validateTitleNode = (node: TitleNode): ValidationError[] => {
  const errors: ValidationError[] = []
  if (!node.textContent) {
    errors.push({
      code: VALIDATION_ERROR_CODES.EMPTY_TITLE,
      id: node.attrs.id,
    })
  }
  return errors
}

const validateNode = (
  nodeType: NodeType,
  node: Node,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  doc: Node
): ValidationError[] => {
  switch (nodeType.name) {
    case 'title':
      return validateTitleNode(node as TitleNode)
    default:
      return []
  }
}

export const validateManuscriptNode = (doc: Node): ValidationResult => {
  const schema = doc.type.schema
  const validatableTypes = ['title']
  const errors: ValidationError[] = []

  validatableTypes.forEach((typeName) => {
    const nodeType = schema.nodes[typeName]
    if (nodeType) {
      const nodes = findChildrenByType(doc, nodeType).map(
        (result) => result.node
      )
      nodes.forEach((node) => {
        const nodeErrors = validateNode(nodeType, node, doc)
        errors.push(...nodeErrors)
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
