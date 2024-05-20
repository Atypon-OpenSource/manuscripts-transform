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

import { Model } from '@manuscripts/json-schema'

import { Decoder } from '../decode'
import { HTMLTransformer } from '../html'
import { normalizeIDs } from './__helpers__/ids'

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('JATS importing and exporting to HTML', () => {
  test('round-trips JATS XML to HTML', async () => {
    const input = await readFixture('debug-example.xml')
    const doc = new DOMParser().parseFromString(input, 'application/xml')
    const models = await parseJATSArticle(doc)
    const normalizedModels = normalizeIDs(models)

    const modelMap = new Map<string, Model>()
    for (const model of normalizedModels) {
      modelMap.set(model._id, model)
    }
    const decoder = new Decoder(modelMap)
    const docPM = decoder.createArticleNode()

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(docPM.content, modelMap)

    expect(result).toMatchSnapshot('jats-html-export')
  })
})
