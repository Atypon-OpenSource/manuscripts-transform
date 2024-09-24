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

import { getTrimmedTextContent } from '../../lib/utils'
import { createCounter, JATSExporter } from '../exporter/jats-exporter'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { IDGenerator } from '../types'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readFixture } from './files'

const parseXMLWithDTD = (data: string) =>
  parseXml(data, {
    dtdload: true,
    dtdvalid: true,
    nonet: true,
  })

const idGenerator = (doc: Document): IDGenerator => {
  const counter = createCounter()

  const xpath = 'article-id[pub-id-type="publisher-id"]'
  const id = getTrimmedTextContent(doc, xpath)

  return async (element: Element) => {
    switch (element.nodeName) {
      case 'contrib':
      case 'p':
      case 'ref-list':
      case 'table':
        return null

      case 'ref': {
        const index = String(counter.increment(element.nodeName))

        return `${id}-bib-${index.padStart(4, '0')}`
      }

      case 'sec': {
        if (!element.parentNode || element.parentNode.nodeName !== 'body') {
          return null
        }

        const index = String(counter.increment(element.nodeName))

        return `${id}-sec${index}`
      }

      case 'fig': {
        const index = String(counter.increment(element.nodeName))

        return `${id}-fig-${index.padStart(4, '0')}`
      }

      case 'table-wrap': {
        const index = String(counter.increment(element.nodeName))

        return `${id}-tbl-${index.padStart(4, '0')}`
      }

      default: {
        const index = String(counter.increment(element.nodeName))

        return `${id}-${element.nodeName}${index}`
      }
    }
  }
}

const roundtrip = async (filename: string) => {
  const input = await readFixture(filename)
  const doc = new DOMParser().parseFromString(input, 'application/xml')

  const { node, journal } = parseJATSArticle(doc)

  const exporter = new JATSExporter()
  return await exporter.serializeToJATS(node, {
    journal: journal as Journal,
    csl: DEFAULT_CSL_OPTIONS,
    idGenerator: idGenerator(doc),
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
