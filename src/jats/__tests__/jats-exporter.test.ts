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

import { Element as XMLElement, parseXml } from 'libxmljs2'

import { JATSExporter } from '../exporter/jats-exporter'
import { Version } from '../exporter/jats-versions'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readAndParseFixture } from './files'

const parseXMLWithDTD = (data: string) =>
  parseXml(data, {
    dtdload: true,
    dtdvalid: true,
    nonet: true,
  })

describe('JATS exporter', () => {
  test('export latest version', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-example-full.xml')
    const { node, journal } = parseJATSArticle(input)
    const result = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    expect(result).toMatchSnapshot('jats-export')
  })

  test('export v1.1', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-example-full.xml')
    const { node, journal } = parseJATSArticle(input)
    const result = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
      version: '1.1',
    })

    expect(result).toMatchSnapshot('jats-export-1.1')
  })

  test('export unknown version', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-example-full.xml')
    const { node, journal } = parseJATSArticle(input)

    await expect(async () => {
      await transformer.serializeToJATS(node, {
        csl: DEFAULT_CSL_OPTIONS,
        //@ts-ignore
        journal,
        version: '1.0' as unknown as Version,
      })
    }).rejects.toThrow(Error)
  })
  test('export table-wrap-foot', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-tables-example.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const resultDoc = parseXMLWithDTD(xml)
    const tableWrapFoot = resultDoc.get('//table-wrap/table-wrap-foot')
    const paragraph = resultDoc.get('//table-wrap/table-wrap-foot/p')
    expect(paragraph).not.toBeUndefined()
    expect(tableWrapFoot).not.toBeUndefined()
  })

  test('add journal ID', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-example-full.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })
    expect(xml).toMatchSnapshot('jats-export-submitted')
  })

  test('journal metadata', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-import.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const output = parseXMLWithDTD(xml)
    expect(output.errors).toHaveLength(0)
    expect(output.get<XMLElement>('//journal-title')!.text()).toBe(
      'Brain and Behavior'
    )
    expect(output.get<XMLElement>('//issn')!.text()).toBe('2162-3279')
  })

  test('DTD validation', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-import.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('DTD validation: article with title markup and citations', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-document.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })
    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('Export link', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-import.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const output = parseXMLWithDTD(xml)
    const link = output.get<XMLElement>('//ext-link[@ext-link-type="uri"]')

    expect(link).not.toBeNull()
    expect(link!.text()).toBe('https//orcid.org/0000-0003-2217-5904')

    const attrs: { [key: string]: string } = {}

    for (const attr of link!.attrs()) {
      attrs[attr.name()] = attr.value()
    }

    expect(attrs.href).toBe('https://orcid.org/0000-0003-2217-5904')
    expect(attrs['ext-link-type']).toBe('uri')
  })

  test('Markup in citations', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-import.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const output = parseXMLWithDTD(xml)

    const refs = output.find<XMLElement>('//xref[@ref-type="bibr"]')

    expect(refs).toHaveLength(17)
    expect(refs[0].child(0)!.type()).toBe('text')
    expect(refs[0].text()).toBe('1,2')
    expect(refs[1].child(0)!.type()).toBe('text')
    expect(refs[1].text()).toBe('3')
  })

  test('DTD validation for MathML representation', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-example-doc.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('export with supplement', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-import.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })
    const resultDoc = parseXMLWithDTD(xml)
    const supplementaryMaterial = resultDoc.get('//supplementary-material')
    if (!supplementaryMaterial) {
      throw new Error('No supplementary material found')
    }
    //@ts-ignore
    const textContent = supplementaryMaterial.text().trim()
    //@ts-ignore
    const mimeTypeAttr = supplementaryMaterial.attr('mimetype')
    //@ts-ignore
    const mimeSubtypeAttr = supplementaryMaterial.attr('mime-subtype')
    //@ts-ignore
    const hrefAttr = supplementaryMaterial.attr('href')

    expect(textContent).toBe(
      'final manuscript-hum-huili-dbh-suicide-20200707_figures (9)'
    )
    expect(mimeTypeAttr?.value()).toBe('application')
    expect(mimeSubtypeAttr?.value()).toBe(
      'vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(hrefAttr?.value()).toBe(
      'attachment:7d9d686b-5488-44a5-a1c5-46351e7f9312'
    )
  })

  test('export footnotes', async () => {
    const transformer = new JATSExporter()
    const input = await readAndParseFixture('jats-fn-group.xml')
    const { node, journal } = parseJATSArticle(input)
    const xml = await transformer.serializeToJATS(node, {
      csl: DEFAULT_CSL_OPTIONS,
      //@ts-ignore
      journal,
    })
    const footnoteCategories = [
      'con',
      'deceased',
      'equal',
      'financial-disclosure',
    ]

    const resultDoc = parseXMLWithDTD(xml)

    for (const category of footnoteCategories) {
      const fn = resultDoc.get(
        `/article/back/fn-group/fn[@fn-type="${category}"]`
      )
      expect(fn).not.toBeUndefined()
    }
  })
})
