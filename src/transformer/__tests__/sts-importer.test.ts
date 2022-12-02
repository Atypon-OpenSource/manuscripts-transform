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

import { parseSTSBody, parseSTSFront, parseSTSStandard } from '../sts-importer'
import { normalizeIDs } from './__helpers__/ids'

jest.setTimeout(200000)
const loadFixture = async (filename: string) => {
  const xml = await fs.promises.readFile(
    __dirname + '/data/' + filename,
    'utf-8'
  )

  return new DOMParser().parseFromString(xml as string, 'application/xml')
}

describe('STS importer', () => {
  test('parses STS front to Manuscripts models', async () => {
    const standard = await loadFixture('sts-example.xml')
    const front = standard.querySelector('front') as Element

    const models = parseSTSFront(front)

    expect(models).toHaveLength(1)
  })

  test('parses STS body to a ProseMirror doc', async () => {
    const standard = await loadFixture('sts-example.xml')
    const body = standard.querySelector('body') as Element

    const bodyDoc = parseSTSBody(standard, body, null, [])

    bodyDoc.descendants((node) => {
      // TODO: validate ids before deleting them
      // @ts-ignore
      delete node.attrs.id
      // @ts-ignore
      delete node.attrs.rid
    })
    // @ts-ignore
    delete bodyDoc.attrs.id

    expect(bodyDoc).toMatchSnapshot()
  })

  test('parses STS article to Manuscripts models', async () => {
    const standard = await loadFixture('sts-example.xml')

    const models = await parseSTSStandard(standard)

    // TODO this takes forever
    expect(normalizeIDs(models)).toMatchSnapshot()
  })
})
