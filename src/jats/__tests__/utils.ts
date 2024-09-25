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

import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  schema,
} from '../../schema'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { readAndParseFixture } from './files'

export const createNodeFromJATS = async (fileName: string) => {
  const jats = await readAndParseFixture(fileName)
  return parseJATSArticle(jats)
}

export const changeIDs = (node: ManuscriptNode) => {
  //@ts-ignore
  node.attrs.id = 'some-id'
  node.descendants((child) => {
    if (child.attrs.id) {
      //@ts-ignore
      child.attrs.id = 'some-id'
    }
    if (child.attrs.rid) {
      //@ts-ignore
      child.attrs.rid = 'some-id'
    }
    if (child.type === schema.nodes.contributor) {
      child.attrs.footnote.forEach((footnote: ContributorFootnote) => {
        //@ts-ignore
        footnote.noteID = 'some-id'
      })
      child.attrs.corresp.forEach((corresp: ContributorCorresp) => {
        //@ts-ignore
        corresp.correspID = 'some-id'
      })
      child.attrs.affiliations.forEach(
        (_affiliation: string, index: number) => {
          //@ts-ignore
          child.attrs.affiliations[index] = 'some-id'
        }
      )

      child.attrs.bibliographicName._id = 'some-id'
    }

    if (child.type === schema.nodes.comment) {
      //@ts-ignore
      child.attrs.target = 'some-id'
      child.attrs.contributions.forEach((contribution: any) => {
        contribution._id = 'some-id'
        contribution.timestamp = 1234
      })
    }

    if (child.type === schema.nodes.bibliography_item) {
      child.attrs.author?.forEach((author: any) => (author._id = 'some-id'))
      //@ts-ignore
      if (child.attrs.issued) {
        child.attrs.issued._id = 'some-id'
      }
    }
    child.attrs.rids?.forEach((_rid: string, index: number) => {
      child.attrs.rids[index] = 'some-id'
    })
  })
}
