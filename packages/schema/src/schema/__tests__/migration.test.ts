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
import { migrateFor } from '../migration/migrate'
import { v2_3_20 } from './docs'

describe('Prosemirror migration schema', () => {
  test('Migrating doc from version 2.3.20 to the current', () => {
    expect(() => migrateFor(v2_3_20, '2.3.20')).not.toThrow()
  })
})
