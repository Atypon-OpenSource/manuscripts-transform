/*!
 * © 2025 Atypon Systems LLC
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
import Citeproc from 'citeproc'

import { buildCiteprocCitation } from '../../lib/citeproc'
import { BibliographyItemAttrs } from '../../schema'
import { initJats, jatsVariableWrapper } from '../exporter/citeproc'
import {ama, chicago, DEFAULT_CSL_OPTIONS} from './citations'

const bib1: BibliographyItemAttrs = {
  id: 'bib1',
  type: 'article-journal',
  author: [
    { given: 'John', family: 'Doe' },
    { given: 'Jane', family: 'Smith' },
  ],
  DOI: '10.1000/xyz123',
  issued: { 'date-parts': [[2021]] },
  'container-title': 'AI Research Journal',
  volume: '18',
  issue: '2',
  supplement: 'Suppl. 1',
  page: '45-60',
  title: 'Advancements in Artificial Intelligence',
  locator: 'e012345',
  URL: 'https://doi.org/10.1000/xyz123',
}

const bib2: BibliographyItemAttrs = {
  id: 'bib2',
  type: 'book',
  author: [
    { given: 'Michael', family: 'Brown' },
    { given: 'Anna', family: 'Green' },
  ],
  issued: { 'date-parts': [[2020]] },
  'container-title': 'Introduction to Data Science',
  volume: '1',
  'collection-title': 'Data Science Series',
  edition: '2nd',
  publisher: 'Springer',
  'publisher-place': 'New York, USA',
  editor: [
    { given: 'David', family: 'Williams' },
    { given: 'Sophia', family: 'Taylor' },
  ],
  'number-of-pages': '350',
  URL: 'https://doi.org/10.1000/xyz123',
}

const bib3: BibliographyItemAttrs = {
  id: 'bib3',
  type: 'chapter',
  author: [{ given: 'Susan', family: 'Miller' }],
  issued: { 'date-parts': [[2022]] },
  'container-title': 'Handbook of AI',
  page: '105-120',
  title: 'Machine Learning Applications',
  publisher: 'Oxford University Press',
}

const bib4: BibliographyItemAttrs = {
  id: 'bib4',
  type: 'confproc',
  author: [{ given: 'Emily', family: 'Johnson' }],
  issued: { 'date-parts': [[2019]] },
  'container-title':
    'Proceedings of the International Conference on Machine Learning',
  page: '223-230',
  title: 'Deep Learning in Image Processing',
  publisher: 'IEEE',
  'publisher-place': 'New York, USA',
  event: 'ICML 2019',
  'event-place': 'San Francisco, USA',
  'event-date': { 'date-parts': [[2019, 6, 20]] },
  URL: 'https://icml2019.org/papers/223',
}

const bib5: BibliographyItemAttrs = {
  id: 'bib5',
  type: 'thesis',
  author: [{ given: 'Daniel', family: 'Garcia' }],
  DOI: '10.1234/thesis2021',
  issued: { 'date-parts': [[2021]] },
  title: 'Neural Networks for Natural Language Processing',
  institution: 'University of California, Berkeley',
  'number-of-pages': '350',
  URL: 'https://escholarship.org/uc/item/xyz123',
  comment:
    'Located at: Modern Manuscripts Collection,\n' +
    '                        History of Medicine Division, National Library of\n' +
    '                        Medicine, Bethesda, MD; MS F 179',
}

const bib6: BibliographyItemAttrs = {
  id: 'bib6',
  type: 'webpage',
  author: [{ given: 'Sarah', family: 'Jones' }],
  issued: { 'date-parts': [[2023]] },
  'container-title': 'Data Science Blog',
  title: 'Big Data Trends in 2023',
  accessed: { 'date-parts': [[2024, 2, 15]] },
  URL: 'https://www.datascienceblog.com/big-data-2023',
}

const bib7: BibliographyItemAttrs = {
  id: 'bib7',
  type: 'other',
  author: [{ given: 'Lisa', family: 'Adams' }],
  DOI: undefined,
  issued: { 'date-parts': [[2022]] },
  'container-title': 'Internal Research Report',
  title: 'Private Research Report on AI Ethics',
  publisher: 'AI Ethics Initiative',
}

const buildCitation = (id: string) =>
  buildCiteprocCitation({
    id: `${id}-citation`,
    rids: [id],
  })

describe('Export formatted references', () => {
  initJats()

  const data = [
    ['AMA', ama],
    ['Chicago Author Date', chicago],
  ]

  test.each(data)('Export references in %s style', async (name, style) => {
    const bibitems: Map<string, BibliographyItemAttrs> = new Map()
    bibitems.set(bib1.id, bib1)
    bibitems.set(bib2.id, bib2)
    bibitems.set(bib3.id, bib3)
    bibitems.set(bib4.id, bib4)
    bibitems.set(bib5.id, bib5)
    bibitems.set(bib6.id, bib6)
    bibitems.set(bib7.id, bib7)

    const citations: Citeproc.Citation[] = [
      buildCitation(bib1.id),
      buildCitation(bib2.id),
      buildCitation(bib3.id),
      buildCitation(bib4.id),
      buildCitation(bib5.id),
      buildCitation(bib6.id),
      buildCitation(bib7.id),
    ]

    initJats()
    const engine = new Citeproc.Engine(
      {
        retrieveLocale: () => DEFAULT_CSL_OPTIONS.locale,
        retrieveItem: (id: string) => {
          const item = bibitems.get(id)
          if (!item) {
            throw Error(`Missing bibliography item with id ${id}`)
          }
          return item as CSL.Data
        },
        variableWrapper: jatsVariableWrapper,
      },
      style
    )
    engine.setOutputFormat('jats')

    const citationTexts = engine.rebuildProcessorState(citations)
    const [meta, bibliography] = engine.makeBibliography()

    for (const [id, _, text] of citationTexts) {
      expect(text).toMatchSnapshot(id)
    }

    for (let i = 0; i < bibliography.length; i++) {
      const id = meta.entry_ids[i][0]
      const fragment = bibliography[i]
      expect(fragment).toMatchSnapshot(id)
    }
  })
})
