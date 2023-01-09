/*!
 * © 2020 Atypon Systems LLC
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
import { ObjectTypes } from '@manuscripts/json-schema'

import { DEFAULT_PAGE_LAYOUT } from '../builders'
import {
  fromPrototype,
  loadBundledDependencies,
  StyleObject,
  updatedPageLayout,
} from '../manuscript-dependencies'

describe('manuscript dependencies', () => {
  test('loads bundled dependencies', async () => {
    const models = await loadBundledDependencies()

    expect(models).toMatchSnapshot()

    expect(models.some((model) => !model.bundled)).toBe(false)
  })

  test('creates a PageLayout model', async () => {
    const models = await loadBundledDependencies()

    const modelMapFromPrototype = new Map(
      models.map(fromPrototype).map((model) => [model._id, model])
    )

    const result = updatedPageLayout(
      modelMapFromPrototype as Map<string, StyleObject>,
      DEFAULT_PAGE_LAYOUT
    )

    expect(result.objectType).toBe(ObjectTypes.PageLayout)
  })
})
