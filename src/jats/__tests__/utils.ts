/*!
 * © 2024 Atypon Systems LLC
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

import { ManuscriptNode, schema } from '../../schema'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { sectionCategories } from './data/section-categories'
import { readAndParseFixture } from './files'
export const createNodeFromJATS = async (fileName: string) => {
  const jats = await readAndParseFixture(fileName)
  return parseJATSArticle(jats, sectionCategories)
}

const uuidRegex =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g
const replaceUUIDWithTest = (input: string) => input.replace(uuidRegex, 'test')

const updateContributorNodeIDs = (node: ManuscriptNode) => {
  if (node.type === schema.nodes.contributor) {
    //@ts-ignore
    node.attrs.footnote = node.attrs.footnote.map((fn) => {
      return { ...fn, noteID: replaceUUIDWithTest(fn.noteID) }
    })
    //@ts-ignore
    node.attrs.corresp = node.attrs.corresp.map((corresp) => {
      return { ...corresp, correspID: replaceUUIDWithTest(corresp.correspID) }
    })
    //@ts-ignore
    node.attrs.affiliations = node.attrs.affiliations.map((aff: string) =>
      replaceUUIDWithTest(aff)
    )
    if (node.attrs.bibliographicName._id) {
      node.attrs.bibliographicName._id = replaceUUIDWithTest(
        node.attrs.bibliographicName._id
      )
    }
  }
}

const updateCommentNodeIDs = (node: ManuscriptNode) => {
  if (node.type === schema.nodes.comment) {
    //@ts-ignore
    node.attrs.target = replaceUUIDWithTest(node.attrs.target)
    //@ts-ignore
    node.attrs.contributions = node.attrs.contributions.map(
      (contribution: any) => {
        return {
          ...contribution,
          _id: replaceUUIDWithTest(contribution._id),
          timestamp: 1234,
        }
      }
    )
  }
}

const updateBibliographyItemNodeIDs = (node: ManuscriptNode) => {
  if (node.type === schema.nodes.bibliography_item) {
    node.attrs.author?.forEach(
      (author: any) => (author._id = replaceUUIDWithTest(author._id))
    )
    node.attrs.editor?.forEach(
      (author: any) => (author._id = replaceUUIDWithTest(author._id))
    )
    //@ts-ignore
    if (node.attrs.issued) {
      node.attrs.issued._id = replaceUUIDWithTest(node.attrs.issued._id)
    }
  }
}

const updateNodeRID = (node: ManuscriptNode) => {
  if (node.attrs.rid) {
    //@ts-ignore
    node.attrs.rid = replaceUUIDWithTest(node.attrs.rid)
  }
}
const updateNodeRIDs = (node: ManuscriptNode) => {
  if (node.attrs.rids) {
    //@ts-ignore
    node.attrs.rids = node.attrs.rids.map((rid) => replaceUUIDWithTest(rid))
  }
}

export const changeIDs = (node: ManuscriptNode) => {
  updateNodeID(node)
  node.descendants((child) => {
    updateNodeID(child)
    updateNodeRID(child)
    updateNodeRIDs(child)
    updateContributorNodeIDs(child)
    updateCommentNodeIDs(child)
    updateBibliographyItemNodeIDs(child)
  })
}

export const findNodesByType = (node: Node, type: NodeType, descend = true) => {
  return findChildrenByType(node, type, descend).map((n) => n.node)
}
export const findNodeByType = (node: Node, type: NodeType, descend = true) => {
  return findNodesByType(node, type, descend)[0]
}

export const updateNodeID = (node: ManuscriptNode) => {
  if (node.attrs.id) {
    //@ts-ignore
    node.attrs.id = replaceUUIDWithTest(node.attrs.id)
  }
}
