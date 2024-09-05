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

import { v4 as uuidv4 } from 'uuid'

import {
  contributorCorresp,
  contributorFootnote,
  ManuscriptNode,
  schema,
} from '../../schema'
import { generateID, nodeTypesMap } from '../../transformer'

export const updateDocumentIDs = (
  node: ManuscriptNode,
  replacements: Map<string, string>
) => {
  const warnings: string[] = []
  const highlightNodes: ManuscriptNode[] = []

  recurseDoc(node, (n, parent) =>
    updateNodeID(n, parent, replacements, warnings, highlightNodes)
  )
  recurseDoc(node, (n) => updateNodeRID(n, replacements, warnings))
  recurseDoc(node, (n) => updateNodeRIDS(n, replacements, warnings))
  recurseDoc(node, (n) => updateContributorNodesIDS(n, replacements, warnings))

  return warnings
}

/**
 * Recurses the document starting from the top node (which is omitted with node.descendants function)
 * @param node
 * @param fn
 */
function recurseDoc(
  node: ManuscriptNode,
  fn: (n: ManuscriptNode, parent: ManuscriptNode | null) => void,
  parent: ManuscriptNode | null = null
) {
  fn(node, parent)
  node.descendants((n, pos, parent) => fn(n, parent))
}

/**
 * Provide IDs to nodes that have IDs but no value (null or '') by mutating them
 */
const updateNodeID = (
  node: ManuscriptNode,
  parent: ManuscriptNode | null,
  replacements: Map<string, string>,
  warnings: string[],
  highlightNodes: ManuscriptNode[]
) => {
  if (node.type === schema.nodes.inline_equation) {
    // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
    node.attrs = {
      ...node.attrs,
      id: `InlineMathFragment:${uuidv4()}`,
    }
    return
  }

  if (node.type === schema.nodes.manuscript) {
    return
  }

  if (node.type === schema.nodes.highlight_marker) {
    // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
    node.attrs = {
      ...node.attrs,
      tid: parent?.attrs.id,
    }
    highlightNodes.push(node)
    return
  }

  if (node.type === schema.nodes.comment) {
    const highlightNode = highlightNodes.find(
      (n) => n.attrs.id === node.attrs.id
    )
    if (highlightNode) {
      // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
      node.attrs = {
        ...node.attrs,
        target: highlightNode.attrs.tid,
      }
    }
    return
  }

  if (node.type === schema.nodes.general_table_footnote) {
    // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
    node.attrs = {
      ...node.attrs,
      id: `GeneralTableFootnote:${uuidv4()}`,
    }
    return
  }
  if (!('id' in node.attrs)) {
    return
  }
  const objectType = nodeTypesMap.get(node.type)
  if (!objectType) {
    warnings.push(`Unknown object type for node type ${node.type.name}`)
    return
  }
  const previousID = node.attrs.id
  const nextID = generateID(objectType)
  if (previousID) {
    if (
      replacements.has(previousID) ||
      Array.from(replacements.values()).includes(previousID)
    ) {
      warnings.push(`node.attrs.id ${previousID} exists twice!`)
      return
    }
    replacements.set(previousID, nextID)
  }
  // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
  node.attrs = {
    ...node.attrs,
    id: nextID,
  }
}

/**
 * Replaces cross-reference rids of nodes by mutating their attributes
 */
const updateNodeRID = (
  node: ManuscriptNode,
  replacements: Map<string, string>,
  // eslint-disable-next-line
  warnings: string[]
) => {
  const previousRID = node.attrs.rid
  if (!('rid' in node.attrs) || !previousRID) {
    return
  }
  if (!replacements.has(previousRID)) {
    // TODO produces a lot of missing replacements..
    // warnings.push(`Missing replacement for node.attrs.rid ${previousRID}`)
  } else {
    // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
    node.attrs = {
      ...node.attrs,
      rid: replacements.get(previousRID),
    }
  }
}

const updateNodeRIDS = (
  node: ManuscriptNode,
  replacements: Map<string, string>,
  // eslint-disable-next-line
  warnings: string[]
) => {
  const previousRIDs: string[] = node.attrs.rids
  if (!('rids' in node.attrs) || !previousRIDs.length) {
    return
  }
  // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
  node.attrs = {
    ...node.attrs,
    rids: previousRIDs.map((r) => replacements.get(r) || r),
  }
}

/**
 * Updates the IDS for corresps, affiliations and footnotes inside the contributor
 */

const updateContributorNodesIDS = (
  node: ManuscriptNode,
  replacements: Map<string, string>,
  // eslint-disable-next-line
  warnings: string[]
) => {
  if (node.type === schema.nodes.contributor) {
    const footnote = node.attrs.footnote?.map((fn: contributorFootnote) => {
      return {
        ...fn,
        noteID: replacements.get(fn.noteID),
      }
    })
    const corresp = node.attrs.corresp?.map((corresp: contributorCorresp) => {
      return {
        ...corresp,
        correspID: replacements.get(corresp.correspID),
      }
    })
    const affiliations = node.attrs.affiliations.map((affiliation: string) => {
      return replacements.get(affiliation)
    })
    // @ts-ignore - while attrs are readonly, it is acceptable to change them when document is inactive and there is no view
    node.attrs = {
      ...node.attrs,
      footnote,
      corresp,
      affiliations,
    }
  }

  if (node.type !== schema.nodes.contributors) {
    return false
  }
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
  renameJatsNodesToHTML(element, temp, createElement)
  return temp.innerHTML
}
