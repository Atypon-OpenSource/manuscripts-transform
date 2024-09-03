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

import { Model } from '@manuscripts/json-schema'
import { parseXml } from 'libxmljs2'
import mime from 'mime'

import { createCounter, JATSExporter } from '../../jats/jats-exporter'
import { getTrimmedTextContent } from '../../lib/utils'
import { findManuscript } from '../../transformer'
import { Decoder } from '../../transformer/decode'
import { IDGenerator, MediaPathGenerator } from '../../types'
import { parseJATSArticle } from '../importer'
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

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const mediaPathGenerator: MediaPathGenerator = async (element, parentID) => {
  const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')

  if (href) {
    const extension = href.split('.').pop()

    if (extension) {
      return `${parentID}.${extension}`
    }
  }

  const mimetype = element.getAttribute('mime-type')
  const mimeSubtype = element.getAttribute('mime-subtype')

  if (mimetype && mimeSubtype) {
    const extension = mime.getExtension(`${mimetype}/${mimeSubtype}`)

    if (extension) {
      return `${parentID}.${extension}`
    }
  }

  return parentID // TODO: default extension?
}

const roundtrip = async (filename: string) => {
  const input = await readFixture(filename)
  const doc = new DOMParser().parseFromString(input, 'application/xml')

  const models = parseJATSArticle(doc)

  const modelMap = new Map<string, Model>()

  for (const model of models) {
    modelMap.set(model._id, model)
  }

  const manuscript = findManuscript(modelMap)

  const decoder = new Decoder(modelMap)
  const article = decoder.createArticleNode(manuscript._id)
  const exporter = new JATSExporter()
  return await exporter.serializeToJATS(
    article.content,
    modelMap,
    manuscript._id,
    {
      version: '1.2',
      idGenerator: idGenerator(doc),
      mediaPathGenerator,
      csl: DEFAULT_CSL_OPTIONS,
    }
  )
}

describe('JATS roundtrip', () => {
  test('jats-import.xml roundtrip', async () => {
    const jats = await roundtrip('jats-example-full.xml')
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
