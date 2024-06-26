/*!
 * © 2019 Atypon Systems LLC
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
import { schema } from '..'
import { MigrationScript } from './migration-script'
import migrationScripts from './migration-scripts'

export type JSONNode = {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs: { [key: string]: any }
  content?: JSONNode[]
  text?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
}

function migrate(
  oldDoc: JSONNode,
  migrationScript: MigrationScript['migrateNode']
) {
  //  const doc = schema.nodeFromJSON(doc)

  function migrateNode(node: JSONNode) {
    const migrated = migrationScript(node, oldDoc, schema)
    if (migrated.content) {
      migrated.content = migrated.content.map((m) => migrateNode(m))
    }
    return migrated
  }

  return migrateNode(oldDoc)
}

export default migrate

export function migrateFor(oldDoc: JSONNode, fromVersion: string) {
  const migrationScripts = ensureVersionAscOrder()

  let migratedDoc = oldDoc
  for (let i = 0; i < migrationScripts.length; i++) {
    const script = migrationScripts[i]
    if (fromVersion == script.fromVersion) {
      //  OR <= for multiple migrations but we also have to fetch appropriate schemas or get rid of schema reference
      migratedDoc = migrate(migratedDoc, script.migrateNode)
    }
  }

  return testDoc(migratedDoc, fromVersion)
  // now find all versions that we have to migrate that do from version
}

function ensureVersionAscOrder() {
  return migrationScripts.sort((a, b) => {
    const aTiers = a.toVersion.split('.')
    const bTiers = b.toVersion.split('.')
    for (let i = 0; i < aTiers.length; i++) {
      const aTier = parseInt(aTiers[i]) || 0
      const bTier = parseInt(bTiers[i]) || 0
      const result = aTier - bTier
      if (result == 0) {
        continue
      }
      return result
    }
    return 0
  })
}

function testDoc(doc: JSONNode, fromVersion: string) {
  try {
    return schema.nodeFromJSON(doc)
  } catch (e) {
    const error =
      'Migration application from version ' +
      fromVersion +
      ' did not produce a valid document with error: ' +
      e
    console.error(error)
    return new Error(error)
  }
}
