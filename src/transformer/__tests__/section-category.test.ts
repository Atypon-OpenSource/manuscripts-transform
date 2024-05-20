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

import { schema } from '../../schema'
import {
  buildSectionCategory,
  chooseSectionCategory,
  chooseSecType,
  isAnySectionNode,
} from '../section-category'

const createJATSDocument = () => {
  const versionIDs = {
    publicId:
      '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2d1 20170631//EN',
    systemId:
      'http://jats.nlm.nih.gov/archiving/1.2d1/JATS-archive-oasis-article1-mathml3.dtd',
  }

  return document.implementation.createDocument(
    null,
    'article',
    document.implementation.createDocumentType(
      'article',
      versionIDs.publicId,
      versionIDs.systemId
    )
  )
}

describe('section category helpers', () => {
  test('any section node', () => {
    expect(isAnySectionNode(schema.nodes.section.create())).toBe(true)

    expect(isAnySectionNode(schema.nodes.keywords.create())).toBe(true)

    expect(isAnySectionNode(schema.nodes.keywords_element.create())).toBe(false)
  })

  test('section category', () => {
    expect(buildSectionCategory(schema.nodes.section.create())).toBeUndefined()

    expect(
      buildSectionCategory(
        schema.nodes.section.create({
          category: 'MPSectionCategory:section',
        })
      )
    ).toBe('MPSectionCategory:section')

    expect(buildSectionCategory(schema.nodes.keywords.create())).toBe(
      'MPSectionCategory:keywords'
    )
  })

  test('choose sec-type', () => {
    expect(chooseSecType('MPSectionCategory:materials-method')).toBe('methods')
    expect(chooseSecType('MPSectionCategory:results')).toBe('results')
    expect(chooseSecType('MPSectionCategory:introduction')).toBe('intro')
  })

  test('choose section category', () => {
    const jatsDocument = createJATSDocument()

    const createSection = (secType?: string, title?: string) => {
      const section = jatsDocument.createElement('sec')

      if (secType) {
        section.setAttribute('sec-type', secType)
      }

      if (title) {
        const titleElement = jatsDocument.createElement('title')
        titleElement.textContent = title
        section.appendChild(titleElement)
      }

      return section
    }

    expect(chooseSectionCategory(createSection('intro'))).toBe(
      'MPSectionCategory:introduction'
    )

    expect(
      chooseSectionCategory(createSection(undefined, 'Introduction'))
    ).toBe('MPSectionCategory:introduction')

    expect(
      chooseSectionCategory(createSection(undefined, 'Materials & Methods'))
    ).toBe('MPSectionCategory:materials-method')

    expect(
      chooseSectionCategory(createSection('conclusions', 'The Conclusions'))
    ).toBe('MPSectionCategory:conclusions')

    expect(chooseSectionCategory(createSection('foo', 'Bar'))).toBe(undefined)
  })
})
