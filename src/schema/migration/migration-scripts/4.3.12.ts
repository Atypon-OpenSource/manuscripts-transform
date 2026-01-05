/*!
 * © 2026 Atypon Systems LLC
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
import { JSONProsemirrorNode } from '../../../types'
import { MigrationScript } from '../migration-script'

class Migration4312 implements MigrationScript {
  fromVersion = '4.3.11'
  toVersion = '4.3.12'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (node.type === 'contributor') {
      if (node.attrs.affiliations) {
        node.attrs.affiliationIDs = node.attrs.affiliations
        delete node.attrs.affiliations
      }
      if (Array.isArray(node.attrs.corresp)) {
        node.attrs.correspIDs = node.attrs.corresp.map((c) => c.correspID)
        delete node.attrs.corresp
      }
      if (Array.isArray(node.attrs.footnote)) {
        node.attrs.footnoteIDs = node.attrs.footnote.map((f) => f.noteID)
        delete node.attrs.footnote
      }
      node.attrs.given = node.attrs.bibliographicName.given
      node.attrs.family = node.attrs.bibliographicName.family
      node.attrs.suffix = node.attrs.bibliographicName.suffix
      node.attrs.ORCID = node.attrs.ORCIDIdentifier
      delete node.attrs.bibliographicName
      delete node.attrs.userID
      delete node.attrs.ORCIDIdentifier
    }
    if (node.type === 'comment') {
      const contribution = node.attrs.contributions[0]
      node.attrs.userID = contribution.profileID
      node.attrs.timestamp = contribution.timestamp
      delete node.attrs.contributions
    }
    return node
  }
}

export default Migration4312
