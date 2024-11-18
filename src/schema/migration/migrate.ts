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
import { cloneDeep } from 'lodash'
import semver from 'semver'

import { schema } from '..'
import { MigrationScript } from './migration-script'
import migrationScripts from './migration-scripts'

export default function migrate(
  oldDoc: JSONNode,
  migrationScript: MigrationScript['migrateNode']
) {
  function migrateNode(node: JSONNode) {
    const migrated = migrationScript(node, oldDoc)
    if (migrated.content) {
      migrated.content = migrated.content.map((m) => migrateNode(m))
    }
    return migrated
  }

  return migrateNode(oldDoc)
}

export function migrateFor(oldDoc: JSONNode, baseVersion: string) {
  const migrationScripts = ensureVersionAscOrder()
  let migratedDoc = cloneDeep(oldDoc)

  for (let i = 0; i < migrationScripts.length; i++) {
    const script = migrationScripts[i]
    if (semver.lt(script.fromVersion, baseVersion)) {
      continue
    }
    console.log('Migrating doc with script to version ' + script.toVersion)
    migratedDoc = migrate(migratedDoc, script.migrateNode)
  }

  return testDoc(migratedDoc, baseVersion)
  // now find all versions that we have to migrate that do from version
}

const ensureVersionAscOrder = () =>
  migrationScripts.sort((a, b) => semver.compare(a.toVersion, b.toVersion))

function testDoc(doc: JSONNode, fromVersion: string) {
  try {
    // not that even if the doc doesn't really require a migration but the schema changed it still needs to go through migration process
    // this is needed to make sure that DB version of it is in sync with FE so the updates can be correctly exchanged
    const resultDoc = schema.nodeFromJSON(doc)

    resultDoc.check()
    return resultDoc
  } catch (e) {
    const error =
      'Migration application from version ' +
      fromVersion +
      ' did not produce a valid document with ' +
      e
    throw new Error(error)
  }
}
