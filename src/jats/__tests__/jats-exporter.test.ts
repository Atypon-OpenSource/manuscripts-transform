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

import {
  ParagraphElement,
  Section,
  Supplement,
  Table,
} from '@manuscripts/json-schema'
import { Element as XMLElement, parseXml } from 'libxmljs2'

import { JATSExporter } from '../exporter/jats-exporter'
import { Version } from '../exporter/jats-versions'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readAndParseFixture } from './files'
import { getDocFromModelMap, getModelMapFromXML } from './utils'

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

  // test('export table rowspan & colspan & multiple headers', async () => {
  //   const transformer = new JATSExporter()
  //   const input = await readAndParseFixture('jats-tables-example.xml')
  //   const { node, journal } = parseJATSArticle(input)
  //   const xml = await transformer.serializeToJATS(node, {
  //     csl: DEFAULT_CSL_OPTIONS,
  //     //@ts-ignore
  //     journal,
  //   })
  //   const resultDoc = parseXMLWithDTD(xml)

  //   // Check for rowspan
  //   const rowSpanCells = resultDoc.find('//table/tbody/tr/td[@rowspan]')
  //   expect(rowSpanCells.length).toBeGreaterThan(0)

  //   // Check for colspan
  //   const colSpanCells = resultDoc.find('//table/thead/tr/th[@colspan]')
  //   const colSpanValues = colSpanCells.map((cell) =>
  //     parseInt(cell.getAttribute('colspan'), 10)
  //   )

  //   expect(colSpanValues).toContain(2)
  // })

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

  // test('Markup in citations', async () => {
  //   const projectBundle = cloneProjectBundle(inputWithCitations)

  //   const { doc, modelMap } = parseProjectBundle(projectBundle)

  //   const transformer = new JATSExporter()
  //   const manuscript = findManuscript(modelMap)
  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     { csl: DEFAULT_CSL_OPTIONS }
  //   )

  //   const output = parseXMLWithDTD(xml)

  //   const refs = output.find<XMLElement>('//xref[@ref-type="bibr"]')

  //   expect(refs).toHaveLength(2)

  //   expect(refs[0].child(0)!.type()).toBe('text')
  //   expect(refs[0].text()).toBe('1,2')
  //   expect(refs[1].child(0)!.type()).toBe('text')
  //   expect(refs[1].text()).toBe('3–5')
  // })

  // test('Export manuscript history', async () => {
  //   const projectBundle = cloneProjectBundle(input)

  //   const { doc, modelMap } = parseProjectBundle(projectBundle)

  //   const transformer = new JATSExporter()
  //   const manuscript = findManuscript(modelMap)
  //   manuscript.revisionRequestDate = 1549312452
  //   manuscript.correctionDate = 1549312452
  //   manuscript.revisionReceiveDate = 839335536
  //   manuscript.acceptanceDate = 1818419713

  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     {
  //       version: '1.2',
  //       doi: '10.1234/5678',
  //       id: '4567',
  //       frontMatterOnly: true,
  //       csl: DEFAULT_CSL_OPTIONS,
  //     }
  //   )
  //   expect(xml).toMatchSnapshot()

  //   const { errors } = parseXMLWithDTD(xml)
  //   expect(errors).toHaveLength(0)
  // })

  // test('DTD validation for MathML representation', async () => {
  //   const jats = await readAndParseFixture('jats-import.xml')
  //   const transformer = new JATSExporter()

  //   const { manuscript, journal, node } = parseJATSArticle(jats)
  //   const xml = await transformer.serializeToJATS(
  //     node,
  //     DEFAULT_CSL_OPTIONS,
  //     manuscript,
  //     journal
  //   )

  //   const { errors } = parseXMLWithDTD(xml)

  //   expect(errors).toHaveLength(0)
  // })

  // test('export with article-type attribute', async () => {
  //   const projectBundle = cloneProjectBundle(input)

  //   const { doc, modelMap } = parseProjectBundle(projectBundle)

  //   const manuscript = findManuscript(modelMap)

  //   manuscript.articleType = 'essay'

  //   const transformer = new JATSExporter()

  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     { csl: DEFAULT_CSL_OPTIONS }
  //   )

  //   expect(xml).toMatchSnapshot('jats-export-with-article-type')

  //   const { errors } = parseXMLWithDTD(xml)

  //   expect(errors).toHaveLength(0)
  // })

  // test('export with supplement', async () => {
  //   const suppl: Supplement = {
  //     containerID: '',
  //     manuscriptID: '',
  //     createdAt: 0,
  //     updatedAt: 0,
  //     _id: 'MPSupplement:B5B88C22-FBE7-4C03-811D-938424F7B452',
  //     objectType: 'MPSupplement',
  //     title: 'final manuscript-hum-huili-dbh-suicide-20200707_figures (9)',
  //     href: 'attachment:7d9d686b-5488-44a5-a1c5-46351e7f9312',
  //     MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  //   }
  //   input.data.push(suppl)
  //   const projectBundle = cloneProjectBundle(input)
  //   const { doc, modelMap } = parseProjectBundle(projectBundle)
  //   const manuscript = findManuscript(modelMap)
  //   const transformer = new JATSExporter()
  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     { csl: DEFAULT_CSL_OPTIONS }
  //   )

  //   expect(xml).toMatchSnapshot('jats-export-with-supplement')
  //   const { errors } = parseXMLWithDTD(xml)
  //   expect(errors).toHaveLength(0)
  // })

  // test('export footnotes', async () => {
  //   const projectBundle = cloneProjectBundle(input)

  //   const footnoteCategories = [
  //     'con',
  //     'conflict',
  //     'deceased',
  //     'equal',
  //     'present-address',
  //     'presented-at',
  //     'previously-at',
  //     'supplementary-material',
  //     'supported-by',
  //     'financial-disclosure',
  //     'ethics-statement',
  //     'competing-interests',
  //   ]

  //   let cnt = 0
  //   for (const category of footnoteCategories) {
  //     const fnSectionModel: Section = {
  //       _id: `MPSection:${cnt++}`,
  //       category: `MPSectionCategory:${category}`,
  //       elementIDs: [],
  //       objectType: 'MPSection',
  //       path: [`MPSection:${cnt++}`],
  //       priority: 0,
  //       title: `a title for ${category}`,
  //       createdAt: 0,
  //       updatedAt: 0,
  //       manuscriptID: 'MPManuscript:1',
  //       containerID: 'MPProject:1',
  //     }

  //     projectBundle.data.push(fnSectionModel)
  //   }

  //   const { doc, modelMap } = parseProjectBundle(projectBundle)

  //   const transformer = new JATSExporter()
  //   const manuscript = findManuscript(modelMap)
  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     { csl: DEFAULT_CSL_OPTIONS }
  //   )

  //   const resultDoc = parseXMLWithDTD(xml)

  //   for (const category of footnoteCategories) {
  //     const fnType =
  //       category === 'competing-interests' ? 'coi-statement' : category
  //     let fn = resultDoc.get(`/article/back/fn-group/fn[@fn-type="${fnType}"]`)
  //     if (fnType === 'coi-statement') {
  //       fn = resultDoc.get(
  //         `/article/front/article-meta/author-notes/fn[@fn-type="${fnType}"]`
  //       )
  //     }
  //     expect(fn).not.toBeUndefined()
  //   }
  // })
})
