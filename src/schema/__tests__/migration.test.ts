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
import * as prevPackage from 'migration-base'

import { createTestDoc } from '../../transformer'
import { JSONNode, migrateFor } from '../migration/migrate'

function checkRetrievePrevVersionDoc() {
  // creating test premises - letting it fail for the dev to be aware that something is not right
  const prevDoc = prevPackage.createTestDoc().toJSON()
  const testDoc = createTestDoc()
  testDoc.check()

  return prevDoc as JSONNode
}

describe('Prosemirror migration schema', () => {
  const prevVersionDoc = checkRetrievePrevVersionDoc()
  test('Migrating doc from prev version to the current', () => {
    // eslint-disable-next-line jest/no-standalone-expect
    expect(() =>
      migrateFor(prevVersionDoc!, prevPackage.getVersion())
    ).not.toThrow()
  })
})
