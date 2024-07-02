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
import { isEqual } from 'lodash'
import * as prevPackage from 'migration-base'

import { getVersion } from '../../getVersion'
import { JSONNode, migrateFor } from '../migration/migrate'
import { createTestDoc } from '../../transformer'

function checkIfNeededAndFetchDoc() {
  const prevDoc = prevPackage.createTestDoc().toJSON()
  const testD = createTestDoc()
  testD.check()

  const currentDoc = testD.toJSON()

  try {
    if (isEqual(prevDoc, currentDoc)) {
      console.log(
        `Schemas outputs is equal between ${getVersion()} and ${prevPackage.getVersion()}. Skipping migrations test.`
      )
      return null
    }

    console.log(
      'Schemas outputs has changed since base version - proceeding with test.'
    )
    return prevDoc as JSONNode
  } catch (e) {
    console.error(
      'Migration test will note be executed due to the following error: ' + e
    )
    return null
  }
}

describe('Prosemirror migration schema', () => {
  const prevVersionDoc = checkIfNeededAndFetchDoc()

  // @TODO - merge the exposure of createTestDoc first
  const maybeTest = prevVersionDoc ? test : test.skip

  if (!prevVersionDoc) {
    console.log('Skipping migration test because no prevVersionDoc was found.')
  }

  maybeTest('Migrating doc from prev version to the current', () => {
    // eslint-disable-next-line jest/no-standalone-expect
    expect(() =>
      migrateFor(prevVersionDoc!, prevPackage.getVersion())
    ).not.toThrow()
  })
})
