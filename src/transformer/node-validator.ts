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

export interface ValidationError {
  code: string
  nodeType?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export const VALIDATION_ERROR_CODES = {
  MISSING_TITLE: 'MISSING_TITLE',
  EMPTY_TITLE: 'EMPTY_TITLE',
}

const validateTitleNode = (nodes: Node[]): ValidationResult => {
  const errors: ValidationError[] = []
  if (!nodes.length) {
    errors.push({
      code: VALIDATION_ERROR_CODES.MISSING_TITLE,
    })
  }
  nodes.forEach((node) => {
    if (!node.textContent) {
      errors.push({
        code: VALIDATION_ERROR_CODES.EMPTY_TITLE,
        nodeType: node.type.name,
      })
    }
  })
  return {
    isValid: errors.length === 0,
    errors,
  }
}

const validate = (
  nodeType: NodeType,
  nodes: Node[]
): ValidationResult | null => {
  switch (nodeType.name) {
    case 'title':
      return validateTitleNode(nodes)
    default:
      return null
  }
}

export const validateManuscriptNode = (node: Node): ValidationResult => {
  const schema = node.type.schema
  const validatableTypes = ['title']
  const errors: ValidationError[] = []

  validatableTypes.forEach((typeName) => {
    const nodeType = schema.nodes[typeName]
    if (nodeType) {
      const nodes = findChildrenByType(node, nodeType).map(
        (result) => result.node
      )
      const validationResult = validate(nodeType, nodes)
      if (validationResult && !validationResult.isValid) {
        errors.push(...validationResult.errors)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
