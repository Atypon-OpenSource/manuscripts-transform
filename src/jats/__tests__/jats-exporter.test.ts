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
  Keyword,
  Manuscript,
  ObjectTypes,
  ParagraphElement,
  Section,
  Supplement,
  Table,
} from '@manuscripts/json-schema'
import { Element as XMLElement, parseXml } from 'libxmljs2'

import projectDump from '../../__tests__/data/project-dump.json'
import projectDumpWithCitations from '../../__tests__/data/project-dump-2.json'
import {
  findJournal,
  findManuscript,
  isManuscript,
  parseProjectBundle,
  ProjectBundle,
} from '../../transformer'
import { journalMeta } from '../../transformer/__tests__/__helpers__/journal-meta'
import { parseJATSArticle } from '../importer'
import { JATSExporter } from '../jats-exporter'
import { Version } from '../jats-versions'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readAndParseFixture } from './files'
import { getDocFromModelMap, getModelMapFromXML } from './utils'

const input = projectDump as ProjectBundle
const inputWithCitations = projectDumpWithCitations as ProjectBundle

const cloneProjectBundle = (input: ProjectBundle): ProjectBundle =>
  JSON.parse(JSON.stringify(input))

const parseXMLWithDTD = (data: string) =>
  parseXml(data, {
    dtdload: true,
    dtdvalid: true,
    nonet: true,
  })

describe('JATS exporter', () => {
  test('export latest version', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)
    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const result = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    expect(result).toMatchSnapshot('jats-export')
  })

  test('export v1.1', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const result = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.1',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    expect(result).toMatchSnapshot('jats-export-1.1')
  })

  test('export unknown version', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    await expect(async () => {
      const transformer = new JATSExporter()
      const manuscript = findManuscript(modelMap)
      await transformer.serializeToJATS(doc.content, modelMap, manuscript._id, {
        version: '1.0' as unknown as Version,
        csl: DEFAULT_CSL_OPTIONS,
      })
    }).rejects.toThrow(Error)
  })

  test('move abstract to front by section category', async () => {
    const projectBundle = cloneProjectBundle(input)

    const model: Section = {
      _id: 'MPSection:123',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: 'MPSectionCategory:abstract',
      title: 'Foo',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:123'],
      priority: 0,
    }

    projectBundle.data.push(model)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)

    const result = resultDoc.get('/article/front/article-meta/abstract')

    expect(result).not.toBeNull()
  })

  test('move multiple abstracts to front by section category', async () => {
    const projectBundle = cloneProjectBundle(input)

    const abstractModel1: Section = {
      _id: 'MPSection:123',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: 'MPSectionCategory:abstract',
      title: 'Abstract',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:123'],
      priority: 0,
    }

    projectBundle.data.push(abstractModel1)

    const abstractModel2: Section = {
      _id: 'MPSection:124',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: 'MPSectionCategory:abstract-teaser',
      title: 'Teaser Abstract',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:124'],
      priority: 0,
    }

    projectBundle.data.push(abstractModel2)

    const abstractModel3: Section = {
      _id: 'MPSection:125',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: 'MPSectionCategory:abstract-graphical',
      title: 'Graphical Abstract',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:125'],
      priority: 0,
    }

    projectBundle.data.push(abstractModel3)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)

    const abstract = resultDoc.get('/article/front/article-meta/abstract')

    expect(abstract).not.toBeUndefined()

    const abstractTeaser = resultDoc.get(
      '/article/front/article-meta/abstract[@abstract-type="teaser"]'
    )

    expect(abstractTeaser).not.toBeUndefined()

    const abstractGraphical = resultDoc.get(
      '/article/front/article-meta/abstract[@abstract-type="graphical"]'
    )

    expect(abstractGraphical).not.toBeUndefined()
  })
  test('export table-wrap-foot', async () => {
    const modelMap = await getModelMapFromXML('jats-tables-example.xml')
    const doc = await getDocFromModelMap(modelMap)
    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)
    const tableWrapFoot = resultDoc.get('//table-wrap/table-wrap-foot')
    const paragraph = resultDoc.get('//table-wrap/table-wrap-foot/p')
    expect(paragraph).not.toBeUndefined()
    expect(tableWrapFoot).not.toBeUndefined()
  })

  test('export table rowspan & colspan & multiple headers', async () => {
    const projectBundle = cloneProjectBundle(input)

    const tableContents1 = `<table>
          <thead style="display: table-header-group;">
            <tr>
              <th colspan="2" scope="col" data-placeholder-text="Header 1">Table Header 1</th>
            </tr>
            <tr>
              <th colspan="3" scope="col" data-placeholder-text="Header 2">Table Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="2" valign="top" align="left" style="border-top: solid 0.50pt" scope="row">1</td>
              <td rowspan="2" valign="top" align="left" style="border-top: solid 0.50pt">2</td>
              <td valign="top" align="left" style="border-top: solid 0.50pt">3</td>
            </tr>
            <tr>
              <td valign="top" colspan="1" align="left" scope="col">4</td>
            </tr>
          <tfoot style="display: table-footer-group;">
            <tr>
              <td data-placeholder-text="Footer 1">Table Footer</td>
            </tr>
          </tfoot>
      </table>`

    // example with <tbody> only
    const tableContents2 = `<table>
          <tbody>
            <tr>
              <td colspan="4" scope="col" data-placeholder-text="Header 1">Table Header 3</td>
              <td colspan="5" scope="col" data-placeholder-text="Header 2">Table Header 4</td>
              <td valign="top" align="left" style="border-top: solid 0.50pt">3</td>
            </tr>
            <tr>
              <td valign="top" colspan="1" align="left" scope="col">4</td>
            </tr>
          </tbody>
      </table>`

    const tableModels = projectBundle.data.filter(
      (i) => i.objectType === 'MPTable'
    ) as Table[]

    if (tableModels.length > 1) {
      tableModels[0].contents = tableContents1
      tableModels[1].contents = tableContents2
    }

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)

    const rowSpanCell = resultDoc.get('//table/tbody/tr/td[@rowspan = 2]')
    expect(rowSpanCell).not.toBeUndefined()

    const colSpanCell1 = resultDoc.get('//table/thead/tr/th[@colspan = 2]')
    expect(colSpanCell1).not.toBeUndefined()

    const colSpanCell2 = resultDoc.get('//table/thead/tr/th[@colspan = 3]')
    expect(colSpanCell2).not.toBeUndefined()

    const colSpanCell3 = resultDoc.get('//table/thead/tr/th[@colspan = 4]')
    expect(colSpanCell3).not.toBeUndefined()

    const colSpanCell4 = resultDoc.get('//table/thead/tr/th[@colspan = 5]')
    expect(colSpanCell4).not.toBeUndefined()
  })

  test('move appendices to back by section category', async () => {
    const projectBundle = cloneProjectBundle(input)

    const model: Section = {
      _id: 'MPSection:123',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: 'MPSectionCategory:appendices',
      title: 'Foo',
      label: 'Bar',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:123'],
      priority: 0,
    }

    projectBundle.data.push(model)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )
    expect(xml).toMatchSnapshot()
  })

  test('move abstract to front by title', async () => {
    const projectBundle = cloneProjectBundle(input)

    const model: Section = {
      _id: 'MPSection:123',
      objectType: 'MPSection',
      createdAt: 0,
      updatedAt: 0,
      category: '',
      title: 'Abstract',
      manuscriptID: 'MPManuscript:1',
      containerID: 'MPProject:1',
      path: ['MPSection:123'],
      priority: 3,
    }

    projectBundle.data.push(model)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)

    const result = resultDoc.get('/article/front/article-meta/abstract')

    expect(result).not.toBeNull()
  })

  test('handle ID', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const result = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        id: '123',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    expect(result).toMatchSnapshot('jats-export-id')
  })

  test('handle DOI', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const result = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        doi: '10.0000/123',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    expect(result).toMatchSnapshot('jats-export-doi')
  })

  test('add journal ID', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        doi: '10.0000/123',
        id: '123',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    expect(xml).toMatchSnapshot('jats-export-submitted')
  })

  test('journal metadata', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    modelMap.set(journalMeta._id, journalMeta)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        doi: '10.0000/123',
        id: '123',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    expect(xml).toMatchSnapshot('jats-export-journal-meta')

    const output = parseXMLWithDTD(xml)
    expect(output.errors).toHaveLength(0)
    expect(output.get<XMLElement>('//journal-id')!.text()).toBe('Some id')
    expect(output.get<XMLElement>('//journal-title')!.text()).toBe(
      'journal title'
    )
    expect(output.get<XMLElement>('//issn')!.text()).toBe('123-45')
  })

  test('DTD validation', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('DTD validation: article with title markup and citations', async () => {
    const projectBundle = cloneProjectBundle(inputWithCitations)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const journal = findJournal(modelMap)
    if (!journal) {
      throw new Error('Journal not found')
    }
    const xml = await transformer.serializeToJATS(
      doc,
      { csl: DEFAULT_CSL_OPTIONS },
      manuscript,
      journal
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('DTD validation: with pdf link', async () => {
    const projectBundle = cloneProjectBundle(inputWithCitations)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        links: { self: { pdf: '123.pdf' } },
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)

    expect(xml).toMatch(/<self-uri content-type="pdf" xlink:href="123.pdf"\/>/)
  })

  test('Manuscript Counts', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const manuscript = findManuscript(modelMap)

    manuscript.wordCount = 41
    manuscript.tableCount = 12
    manuscript.figureCount = 23
    manuscript.genericCounts = [{ countType: 'foo', count: 17 }]
    const transformer = new JATSExporter()
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)

    expect(xml).toMatchSnapshot()
  })

  test('Export link', async () => {
    const projectBundle = cloneProjectBundle(input)

    const id = 'MPParagraphElement:150780D7-CFED-4529-9398-77B5C7625044'

    projectBundle.data = projectBundle.data.map((model) => {
      if (model._id === id) {
        const paragraphElement = model as ParagraphElement

        paragraphElement.contents = paragraphElement.contents.replace(
          /The first section/,
          'The <a href="https://example.com" title="An Example">first</a> section'
        )
      }

      return model
    })

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)

    const output = parseXMLWithDTD(xml)

    const link = output.get<XMLElement>('//ext-link[@ext-link-type="uri"]')

    expect(link).not.toBeNull()
    expect(link!.text()).toBe('first')

    const attrs: { [key: string]: string } = {}

    for (const attr of link!.attrs()) {
      attrs[attr.name()] = attr.value()
    }

    expect(attrs.href).toBe('https://example.com')
    expect(attrs.title).toBe('An Example')
  })

  //todo: is this necessary?

  // test('Export with missing bibliography element', async () => {
  //   const projectBundle = cloneProjectBundle(input)

  //   const id = 'MPSection:E07B0D52-9642-4D58-E577-26F8804E3DEE'

  //   projectBundle.data = projectBundle.data.filter(
  //     (model) =>
  //       model.objectType !== ObjectTypes.BibliographyElement && model._id !== id
  //   )

  //   const { doc, modelMap } = parseProjectBundle(projectBundle)

  //   const transformer = new JATSExporter()
  //   const manuscript = findManuscript(modelMap)
  //   const xml = await transformer.serializeToJATS(
  //     doc.content,
  //     modelMap,
  //     manuscript._id,
  //     { csl: DEFAULT_CSL_OPTIONS }
  //   )

  //   const { errors } = parseXMLWithDTD(xml)

  //   expect(errors).toHaveLength(0)

  //   const output = parseXMLWithDTD(xml)

  //   const refs = output.find('//ref-list/ref')

  //   expect(refs).toHaveLength(1)
  // })

  test('Markup in citations', async () => {
    const projectBundle = cloneProjectBundle(inputWithCitations)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const output = parseXMLWithDTD(xml)

    const refs = output.find<XMLElement>('//xref[@ref-type="bibr"]')

    expect(refs).toHaveLength(2)

    expect(refs[0].child(0)!.type()).toBe('text')
    expect(refs[0].text()).toBe('1,2')
    expect(refs[1].child(0)!.type()).toBe('text')
    expect(refs[1].text()).toBe('3–5')
  })

  test('Export manuscript history', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    manuscript.revisionRequestDate = 1549312452
    manuscript.correctionDate = 1549312452
    manuscript.revisionReceiveDate = 839335536
    manuscript.acceptanceDate = 1818419713

    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        doi: '10.1234/5678',
        id: '4567',
        frontMatterOnly: true,
        csl: DEFAULT_CSL_OPTIONS,
      }
    )
    expect(xml).toMatchSnapshot()

    const { errors } = parseXMLWithDTD(xml)
    expect(errors).toHaveLength(0)
  })

  test('Only export front matter', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      {
        version: '1.2',
        doi: '10.1234/5678',
        id: '4567',
        frontMatterOnly: true,
        csl: DEFAULT_CSL_OPTIONS,
      }
    )

    const { errors } = parseXMLWithDTD(xml)
    expect(errors).toHaveLength(0)

    const output = parseXMLWithDTD(xml)

    const front = output.find('//front')
    expect(front).toHaveLength(1)

    const doi = output.find('//article-id[@pub-id-type="doi"]')
    expect(doi).toHaveLength(1)

    const body = output.find('//body')
    expect(body).toHaveLength(0)

    const back = output.find('//back')
    expect(back).toHaveLength(0)
  })
  test('DTD validation for MathML representation', async () => {
    const jats = await readAndParseFixture('jats-import.xml')
    const transformer = new JATSExporter()

    const { manuscript, journal, node } = parseJATSArticle(jats)
    const xml = await transformer.serializeToJATS(
      node,
      { csl: DEFAULT_CSL_OPTIONS },
      manuscript,
      journal
    )

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('export with article-type attribute', async () => {
    const projectBundle = cloneProjectBundle(input)

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const manuscript = findManuscript(modelMap)

    manuscript.articleType = 'essay'

    const transformer = new JATSExporter()

    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    expect(xml).toMatchSnapshot('jats-export-with-article-type')

    const { errors } = parseXMLWithDTD(xml)

    expect(errors).toHaveLength(0)
  })

  test('export with supplement', async () => {
    const suppl: Supplement = {
      containerID: '',
      manuscriptID: '',
      createdAt: 0,
      updatedAt: 0,
      _id: 'MPSupplement:B5B88C22-FBE7-4C03-811D-938424F7B452',
      objectType: 'MPSupplement',
      title: 'final manuscript-hum-huili-dbh-suicide-20200707_figures (9)',
      href: 'attachment:7d9d686b-5488-44a5-a1c5-46351e7f9312',
      MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    input.data.push(suppl)
    const projectBundle = cloneProjectBundle(input)
    const { doc, modelMap } = parseProjectBundle(projectBundle)
    const manuscript = findManuscript(modelMap)
    const transformer = new JATSExporter()
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    expect(xml).toMatchSnapshot('jats-export-with-supplement')
    const { errors } = parseXMLWithDTD(xml)
    expect(errors).toHaveLength(0)
  })

  test('export footnotes', async () => {
    const projectBundle = cloneProjectBundle(input)

    const footnoteCategories = [
      'con',
      'conflict',
      'deceased',
      'equal',
      'present-address',
      'presented-at',
      'previously-at',
      'supplementary-material',
      'supported-by',
      'financial-disclosure',
      'ethics-statement',
      'competing-interests',
    ]

    let cnt = 0
    for (const category of footnoteCategories) {
      const fnSectionModel: Section = {
        _id: `MPSection:${cnt++}`,
        category: `MPSectionCategory:${category}`,
        elementIDs: [],
        objectType: 'MPSection',
        path: [`MPSection:${cnt++}`],
        priority: 0,
        title: `a title for ${category}`,
        createdAt: 0,
        updatedAt: 0,
        manuscriptID: 'MPManuscript:1',
        containerID: 'MPProject:1',
      }

      projectBundle.data.push(fnSectionModel)
    }

    const { doc, modelMap } = parseProjectBundle(projectBundle)

    const transformer = new JATSExporter()
    const manuscript = findManuscript(modelMap)
    const xml = await transformer.serializeToJATS(
      doc.content,
      modelMap,
      manuscript._id,
      { csl: DEFAULT_CSL_OPTIONS }
    )

    const resultDoc = parseXMLWithDTD(xml)

    for (const category of footnoteCategories) {
      const fnType =
        category === 'competing-interests' ? 'coi-statement' : category
      let fn = resultDoc.get(`/article/back/fn-group/fn[@fn-type="${fnType}"]`)
      if (fnType === 'coi-statement') {
        fn = resultDoc.get(
          `/article/front/article-meta/author-notes/fn[@fn-type="${fnType}"]`
        )
      }
      expect(fn).not.toBeUndefined()
    }
  })
})
