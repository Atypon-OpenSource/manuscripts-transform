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

import fs from 'fs'

import { parseTEIGROBIDArticle } from '../tei-grobid-importer'

const loadFixture = async (filename: string) => {
  const xml = await fs.promises.readFile(
    __dirname + '/data/' + filename,
    'utf-8'
  )

  return new DOMParser().parseFromString(xml as string, 'application/xml')
}

describe('TEI GROBID importer', () => {
  test('parses TEI GROBID XML to Manuscripts models', async () => {
    const article = await loadFixture('tei-grobid-example.xml')

    const models = parseTEIGROBIDArticle(article)

    const deidentifiedModels = JSON.parse(
      JSON.stringify(models, (key, value) =>
        key === '_id' ? undefined : value
      )
    )

    expect(deidentifiedModels).toMatchSnapshot()
  })
})
