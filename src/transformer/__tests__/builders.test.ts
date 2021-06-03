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
  BibliographicName,
  BibliographyItem,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import {
  buildAffiliation,
  buildAuxiliaryObjectReference,
  buildBibliographicDate,
  buildBibliographicName,
  buildBibliographyItem,
  buildCitation,
  buildContributor,
  buildFigure,
  buildKeyword,
  buildLibraryCollection,
  buildManuscript,
  buildParagraph,
  buildProject,
  buildStatusLabel,
} from '../builders'

describe('commands', () => {
  test('build project', () => {
    const proj = buildProject('Mr Derp')
    expect(proj._id).toMatch(/MPProject:\S+/)
    expect(proj.objectType).toBe(ObjectTypes.Project)
    expect(proj.owners).toEqual(['Mr Derp'])
    expect(proj.writers).toEqual([])
    expect(proj.viewers).toEqual([])
    expect(proj.title).toBe('')
  })

  test('build manuscript', () => {
    const manuscriptA = buildManuscript('Teh title')
    expect(manuscriptA._id).toMatch(/MPManuscript:\S+/)
    expect(manuscriptA.objectType).toBe(ObjectTypes.Manuscript)
    expect(manuscriptA.title).toBe('Teh title')

    const manuscriptB = buildManuscript()
    expect(manuscriptB._id).toMatch(/MPManuscript:\S+/)
    expect(manuscriptB.objectType).toBe(ObjectTypes.Manuscript)
    expect(manuscriptB.title).toBe('')
  })

  test('build contributor', () => {
    const name: BibliographicName = {
      _id: 'contributor-a',
      objectType: ObjectTypes.BibliographicName,
      nonDroppingParticle: 'van der',
      family: 'Derp',
    }
    const contributor = buildContributor(name, 'author', 3)
    expect(contributor.objectType).toBe(ObjectTypes.Contributor)
    expect(contributor.priority).toBe(3)
    expect(contributor.role).toBe('author')
    expect(contributor.affiliations).toEqual([])
    expect(contributor.bibliographicName.nonDroppingParticle).toBe(
      name.nonDroppingParticle
    )
    expect(contributor.bibliographicName.family).toBe(name.family)
    expect(contributor.bibliographicName.objectType).toBe(
      ObjectTypes.BibliographicName
    )
  })

  test('build bibliography item', () => {
    const data: Partial<BibliographyItem> = {
      title: 'Bibliography item title',
      DOI: 'xyz',
      URL: 'https://humdi.net/evo/',
    }
    const item = buildBibliographyItem(data)
    expect(item._id).toMatch(/MPBibliographyItem:\S+/)
    expect(item.objectType).toBe(ObjectTypes.BibliographyItem)
    expect(item.title).toBe(data.title!)
    expect(item.DOI).toBe(data.DOI!)
    expect(item.URL).toBe(data.URL!)
  })

  test('build bibliographic name', () => {
    const name = {
      given: 'Herp',
      family: 'Derp',
    }
    const bibName = buildBibliographicName(name)
    expect(bibName.given).toBe(name.given)
    expect(bibName.family).toBe(name.family)
    expect(bibName._id).toMatch(/MPBibliographicName:\S+/)
    expect(bibName.objectType).toBe(ObjectTypes.BibliographicName)
  })

  test('build bibliographic date', () => {
    const cslDate = { 'date-parts': [['1998', '20', '1']] }
    const date = buildBibliographicDate(cslDate)
    expect(date._id).toMatch(/MPBibliographicDate:\S+/)
    expect(date.objectType).toBe(ObjectTypes.BibliographicDate)
    expect(date['date-parts']).toEqual(cslDate['date-parts'])
  })

  test('build auxiliary object reference', () => {
    const auxRef = buildAuxiliaryObjectReference('x', ['y'])
    expect(auxRef._id).toMatch(/MPAuxiliaryObjectReference:\S+/)
    expect(auxRef.objectType).toMatch(ObjectTypes.AuxiliaryObjectReference)
    expect(auxRef.containingObject).toMatch('x')
    expect(auxRef.referencedObject).toMatch('y')
  })

  test('build citation', () => {
    const citation = buildCitation('x', ['y'])
    expect(citation._id).toMatch(/MPCitation:\S+/)
    expect(citation.containingObject).toBe('x')
    expect(citation.embeddedCitationItems.length).toBe(1)
    expect(citation.embeddedCitationItems[0].objectType).toBe(
      ObjectTypes.CitationItem
    )
  })

  test('build keyword', () => {
    const keyword = buildKeyword('foo')
    expect(keyword.name).toBe('foo')
    expect(keyword._id).toMatch(/MPKeyword:\S+/)
    expect(keyword.objectType).toMatch(ObjectTypes.Keyword)
  })

  test('build library collection', () => {
    const libraryCollection = buildLibraryCollection('Mr Derp', 'foo')
    expect(libraryCollection.owners).toEqual(['Mr Derp'])
    expect(libraryCollection.writers).toEqual([])
    expect(libraryCollection.viewers).toEqual([])
    expect(libraryCollection.name).toMatch('foo')
    expect(libraryCollection._id).toMatch(/MPLibraryCollection:\S+/)
    expect(libraryCollection.objectType).toMatch(ObjectTypes.LibraryCollection)
  })

  test('build figure', () => {
    const file = new Blob(['foo'], {
      type: 'image/png',
    })

    const fig = buildFigure(file as File)
    expect(fig._id).toMatch(/MPFigure:\S+/)
    expect(fig.objectType).toBe(ObjectTypes.Figure)
    expect(fig.contentType).toBe(file.type)
    expect(fig.src).toMatch(
      /^blob:https:\/\/localhost\/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/
    )
  })

  test('build affiliation', () => {
    const aff = buildAffiliation('x')
    expect(aff._id).toMatch(/MPAffiliation:\S+/)
    expect(aff.objectType).toBe(ObjectTypes.Affiliation)
    expect(aff.institution).toBe('x')
  })

  test('build paragraph', () => {
    const placeholder = 'Start writing!'

    const paragraph = buildParagraph(placeholder)
    expect(paragraph._id).toMatch(/^MPParagraphElement:\S+$/)
    expect(paragraph.objectType).toBe(ObjectTypes.ParagraphElement)
    expect(paragraph.placeholderInnerHTML).toBe(placeholder)
    expect(paragraph.contents).toBe(
      `<p xmlns="http://www.w3.org/1999/xhtml" id="${paragraph._id}" class="MPElement" data-placeholder-text="${placeholder}"></p>`
    )
  })

  test('build status label', () => {
    const statusLabel = buildStatusLabel('test')
    expect(statusLabel._id).toMatch(/MPStatusLabel:\S+/)
    expect(statusLabel.objectType).toBe(ObjectTypes.StatusLabel)
    expect(statusLabel.name).toBe('test')
  })
})
