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

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface Validator {
  validate(): ValidationResult
}

class TitleValidator implements Validator {
  constructor(private nodes: Node[]) {}

  validate(): ValidationResult {
    const errors: string[] = []
    if (!this.nodes.length) {
      errors.push('Title node is missing')
    }
    this.nodes.forEach((node) => {
      if (!node.textContent) {
        errors.push('Title node must have content')
      }
    })
    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

class ValidatorFactory {
  static createValidator(nodeType: NodeType, nodes: Node[]): Validator | null {
    switch (nodeType.name) {
      case 'title':
        return new TitleValidator(nodes)
      default:
        return null
    }
  }
}

class NodeValidator {
  private validators: Validator[] = []

  constructor(node: Node) {
    const schema = node.type.schema
    const validatableTypes = ['title']

    validatableTypes.forEach((typeName) => {
      const nodeType = schema.nodes[typeName]
      if (nodeType) {
        const nodes = findChildrenByType(node, nodeType).map(
          (result) => result.node
        )
        const validator = ValidatorFactory.createValidator(nodeType, nodes)
        if (validator) {
          this.validators.push(validator)
        }
      }
    })
  }

  validate(): ValidationResult {
    const errors: string[] = []
    this.validators.forEach((validator) => {
      const result = validator.validate()
      if (!result.isValid) {
        errors.push(...result.errors)
      }
    })
    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

export const validateManuscriptNode = (node: Node): ValidationResult => {
  const nodeValidator = new NodeValidator(node)
  return nodeValidator.validate()
}
