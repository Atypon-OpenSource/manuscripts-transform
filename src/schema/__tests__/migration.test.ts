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

import { exec } from 'child_process'
import { getVersion } from '../../getVersion'
import { isEqual } from 'lodash'
import { schema } from '..'
import { migrateFor } from '../migration/migrate'
import { Node as ProsemirrorNode } from 'prosemirror-model'

const packageName = '@manuscripts/transform'

async function runInChild(cmd: string) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`)
        // console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        reject(`error: ${stderr}`)
        // console.log(`stderr: ${stderr}`)
        return
      }
      resolve(stdout)
      //   console.log(`stdout: ${stdout}`)
    })
  })
}

async function getPrevProdVersion() {
  try {
    const versionsRaw = await runInChild(`npm show ${packageName} time --json`)

    const versions = JSON.parse(versionsRaw as string)
    if (typeof versions === 'object') {
      const versionsStrings = Object.keys(versions)
      // getting the last production version
      const prev = versionsStrings.reverse().find((v) => {
        if (v.includes('-')) {
          return false
        }
        return true
      })
      if (!prev) {
        console.error(`Unable to locate previous version of ` + packageName)
        return
      }
      // @TODO - may cause yarn.lock change - check before merging
      await runInChild(
        `npm install ${packageName}-${prev}@npm:${packageName}@${prev} --no-save`
      )

      const prevPackage = await import(`${packageName}-${prev}`)
      const prevSchema = prevPackage.schema

      if (isEqual(prevSchema, schema)) {
        console.log(
          `Schemas are equal between ${getVersion()} and ${prev}. Skipping migrations tests`
        )
        return
      }

      // @TODO - merge the exposure of createTestDoc first
      const testDoc = prevPackage.createTestDoc() as ProsemirrorNode
      migrateFor(testDoc.toJSON(), prev)
    }
  } catch (e) {
    console.error(e)
  }
}

getPrevProdVersion()
