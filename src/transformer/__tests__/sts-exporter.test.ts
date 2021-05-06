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

import fs from 'fs'

// import { parseXml } from 'libxmljs2'
import { STSExporter } from '../sts-exporter'
import { parseSTSBody, parseSTSFront } from '../sts-importer'

// const parseXMLWithDTD = (data: string) =>
//   parseXml(data, {
//     dtdload: true,
//     dtdvalid: true,
//     nonet: true,
//   })

describe('STS exporter', () => {
  test('exports valid XML', async () => {
    const input = await fs.promises.readFile(
      __dirname + '/data/sts-example.xml',
      'utf-8'
    )

    const standard = new DOMParser().parseFromString(
      input as string,
      'application/xml'
    )
    const front = standard.querySelector('front') as Element
    const body = standard.querySelector('body') as Element

    const frontModels = parseSTSFront(front)
    const doc = await parseSTSBody(standard, body, [])

    const transformer = new STSExporter()
    const xml = transformer.serializeToSTS(
      doc.content,
      new Map(frontModels.map((m) => [m._id, m]))
    )

    expect(xml).not.toBeNull()

    // TODO: load DTDs via CATALOG env
    // const { errors } = parseXMLWithDTD(xml)

    // expect(errors).toHaveLength(0)
  })
})
