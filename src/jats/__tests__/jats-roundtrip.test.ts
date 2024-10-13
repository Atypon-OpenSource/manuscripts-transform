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

import { Journal } from '@manuscripts/json-schema'
import { parseXml } from 'libxmljs2'

import { JATSExporter } from '../exporter/jats-exporter'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readFixture } from './files'

const parseXMLWithDTD = (data: string) =>
  parseXml(data, {
    dtdload: true,
    dtdvalid: true,
    nonet: true,
  })

const roundtrip = async (filename: string) => {
  const input = await readFixture(filename)
  const doc = new DOMParser().parseFromString(input, 'application/xml')

  const { node, journal } = parseJATSArticle(doc)

  const exporter = new JATSExporter()
  return await exporter.serializeToJATS(node, {
    journal: journal as Journal,
    csl: DEFAULT_CSL_OPTIONS,
  })
}

describe('JATS roundtrip', () => {
  test('jats-import.xml roundtrip', async () => {
    const jats = await roundtrip('jats-import.xml')
    expect(jats).toMatchSnapshot()

    const doc = parseXMLWithDTD(jats)
    expect(doc.errors).toHaveLength(0)
  })
  test('jats-roundtrip.xml roundtrip', async () => {
    const jats = await roundtrip('jats-roundtrip.xml')
    expect(jats).toMatchSnapshot()

    const doc = parseXMLWithDTD(jats)
    expect(doc.errors).toHaveLength(0)
  })
})
