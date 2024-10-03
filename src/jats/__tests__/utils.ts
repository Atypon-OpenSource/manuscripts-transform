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

import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  schema,
} from '../../schema'
import { nodeTypesMap } from '../../transformer'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { readAndParseFixture } from './files'

export const createNodeFromJATS = async (fileName: string) => {
  const jats = await readAndParseFixture(fileName)
  return parseJATSArticle(jats)
}

export const changeIDs = (node: ManuscriptNode) => {
  //@ts-ignore
  node.attrs.id = updateNodeID(node)
  node.descendants((child) => {
    if (child.attrs.id) {
      //@ts-ignore
      child.attrs.id = nodeTypesMap.get(child.type) + ':test'
    }
    if (child.attrs.rid) {
      //@ts-ignore
      child.attrs.rid = 'some-rid'
    }
    if (child.type === schema.nodes.contributor) {
      child.attrs.footnote.forEach((footnote: ContributorFootnote) => {
        //@ts-ignore
        footnote.noteID = 'MPFootnote:test'
      })
      child.attrs.corresp.forEach((corresp: ContributorCorresp) => {
        //@ts-ignore
        corresp.correspID = 'MPCorrespondance:test'
      })
      child.attrs.affiliations.forEach(
        (_affiliation: string, index: number) => {
          //@ts-ignore
          child.attrs.affiliations[index] = 'MPAffiliation:test'
        }
      )

      child.attrs.bibliographicName._id = 'MPBibliographicName:test'
    }

    if (child.type === schema.nodes.comment) {
      //@ts-ignore
      child.attrs.target = 'target-id'
      child.attrs.contributions.forEach((contribution: any) => {
        contribution._id = 'MPContribution:test'
        contribution.timestamp = 1234
      })
    }

    if (child.type === schema.nodes.bibliography_item) {
      child.attrs.author?.forEach((author: any) => (author._id = 'MPBibliographicName:test'))
      //@ts-ignore
      if (child.attrs.issued) {
        child.attrs.issued._id = 'MPBibliographicDate:test'
      }
    }
    child.attrs.rids?.forEach((_rid: string, index: number) => {
      child.attrs.rids[index] = 'some-rid'
    })
  })
}

export const findNodesByType = (node: Node, type: NodeType, descend = true) => {
  return findChildrenByType(node, type, descend).map((n) => n.node)
}
export const findNodeByType = (node: Node, type: NodeType, descend = true) => {
  return findNodesByType(node, type, descend)[0]
}
export const updateNodeID = (node: ManuscriptNode) => {
  //@ts-ignore
  node.attrs = { ...node.attrs, id: nodeTypesMap.get(node.type) + ':test' }
}
