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

import {
  AuxiliaryObjectReference,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import { ManuscriptNode } from '../../schema'
import { generateID } from '../../transformer/id'
import { nodeTypesMap } from '../../transformer/node-types'
import { hasObjectType } from '../../transformer/object-types'

const isAuxiliaryObjectReference = hasObjectType<AuxiliaryObjectReference>(
  ObjectTypes.AuxiliaryObjectReference
)

export function flatten<T>(arrays: T[][]) {
  return ([] as T[]).concat(...arrays)
}

export const fixBodyPMNode = (
  output: ManuscriptNode,
  models: Model[],
  referenceIdsMap: Map<string, string> = new Map<string, string>()
) => {
  const replacements = referenceIdsMap
  const warnings: string[] = []
  recurseDoc(output, (n) => addMissingID(n, replacements, warnings))
  recurseDoc(output, (n) => addMissingRID(n, replacements, warnings))
  return {
    warnings: [...warnings, ...fixReferences(models, replacements)],
    replacements,
  }
}

/**
 * Recurses the document starting from the top node (which is omitted with node.descendants function)
 * @param node
 * @param fn
 */
function recurseDoc(node: ManuscriptNode, fn: (n: ManuscriptNode) => void) {
  fn(node)
  if (node.content) {
    node.content.forEach((n) => recurseDoc(n, fn))
  }
}

/**
 * Provide IDs to nodes that have IDs but no value (null or '') by mutating them
 */
const addMissingID = (
  node: ManuscriptNode,
  replacements: Map<string, string>,
  warnings: string[]
) => {
  if (!('id' in node.attrs)) {
    return
  }
  const objectType = nodeTypesMap.get(node.type)
  if (!objectType) {
    warnings.push(`Unknown object type for node type ${node.type.name}`)
    return
  }
  const previousID: string | null | undefined = node.attrs.id
  const nextID = generateID(objectType)
  if (previousID) {
    if (replacements.has(previousID) || Array.from(replacements.values()).includes(previousID)) {
      warnings.push(`node.attrs.id ${previousID} exists twice!`)
      return
    }
    replacements.set(previousID, nextID)
  }
  node.attrs = { ...node.attrs, id: nextID }
}

/**
 * Replaces cross-reference rids of nodes by mutating their attributes
 */
const addMissingRID = (
  node: ManuscriptNode,
  replacements: Map<string, string>,
  // eslint-disable-next-line
  warnings: string[]
) => {
  const previousRID: string | null | undefined = node.attrs.rid
  if (!('rid' in node.attrs) || !previousRID) {
    return
  }
  if (!replacements.has(previousRID)) {
    // TODO produces a lot of missing replacements..
    // warnings.push(`Missing replacement for node.attrs.rid ${previousRID}`)
  } else {
    node.attrs = { ...node.attrs, rid: replacements.get(previousRID) }
  }
}

/**
 * Fix references to elements from models
 */
const fixReferences = (models: Model[], replacements: Map<string, string>) => {
  const warnings: string[] = []

  const getReferenceId = (referencedObject: string) => {
    const newReferencedId = replacements.get(referencedObject)
    if (newReferencedId) {
      return newReferencedId
    } else {
      warnings.push(
        `Missing replacement for model.referencedObject ${referencedObject}`
      )
    }
  }

  models.forEach((model) => {
    if (isAuxiliaryObjectReference(model)) {
      if (model.referencedObject) {
        model.referencedObject = getReferenceId(model.referencedObject)
      } else {
        const referencedObjects: string[] = []
        model.referencedObjects?.map((reference) => {
          const referenceId = getReferenceId(reference)
          if (referenceId) {
            referencedObjects.push(referenceId)
          }
        })
        model.referencedObjects = referencedObjects
      }
    }
  })
  return warnings
}

// JATS to HTML conversion
const JATS_TO_HTML_MAPPING = new Map<string, string>([
  ['bold', 'b'],
  ['italic', 'i'],
  ['sc', 'style'], // TODO: style
  ['sub', 'sub'],
  ['sup', 'sup'],
])

const renameJatsNodesToHTML = (
  node: Node,
  container: Node,
  createElement: (tagName: string) => HTMLElement
) => {
  node.childNodes.forEach((childNode) => {
    switch (childNode.nodeType) {
      case Node.ELEMENT_NODE: {
        const newNodeName = JATS_TO_HTML_MAPPING.get(childNode.nodeName)

        if (newNodeName) {
          const newNode = createElement(newNodeName)
          renameJatsNodesToHTML(childNode, newNode, createElement)
          container.appendChild(newNode)
        } else {
          console.warn(`Unhandled node name: ${newNodeName}`)
          container.appendChild(childNode.cloneNode())
        }
        break
      }

      case Node.TEXT_NODE:
      default: {
        container.appendChild(childNode.cloneNode())
        break
      }
    }
  })
}

/**
 * Renames JATS nodes to HTML. Doesn't mutate the original document.
 * @param element
 * @param createElement
 * @returns
 */
export const htmlFromJatsNode = (
  element: Element | undefined | null,
  createElement: (tagName: string) => HTMLElement
) => {
  if (!element) {
    return undefined
  }
  const temp = createElement('template') as HTMLTemplateElement
  // Interesting fact: template has special semantics that are not same as regular element's
  // In this case unlike normal div, template's HTML has to be accessed via content
  renameJatsNodesToHTML(element, temp.content, createElement)
  return temp.innerHTML
}
