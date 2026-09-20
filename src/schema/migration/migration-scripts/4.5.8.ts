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

/**
 * Nodes that still carried the `contents` attribute inherited from the
 * json-schema era. The attribute was never read for these types and has been
 * removed from their specs.
 */
const LEGACY_CONTENTS_NODES = new Set([
  'contributor',
  'bibliography_element',
  'keywords_element',
])

/**
 * - contributor content changed from `inline*` (holding a '_' placeholder text
 *   node written by the JATS importer) to `bio?`. Any non-bio content is dropped.
 * - the dead `contents` attribute is removed from the nodes listed above - this won't
 *   invalidate the doc actually so it's added only for hygiene
 */
class Migration458 implements MigrationScript {
  fromVersion = '4.5.7'
  toVersion = '4.5.8'

  migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
    if (
      LEGACY_CONTENTS_NODES.has(node.type) &&
      node.attrs &&
      'contents' in node.attrs
    ) {
      const attrs = { ...node.attrs }
      delete attrs.contents
      node = { ...node, attrs }
    }

    if (node.type === 'contributor') {
      const bio = node.content?.filter((child) => child.type === 'bio')
      const migrated = { ...node }
      delete migrated.content
      return bio?.length ? { ...migrated, content: bio } : migrated
    }

    return node
  }
}

export default Migration458
