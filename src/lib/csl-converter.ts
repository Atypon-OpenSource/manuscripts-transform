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
  BibliographicDate,
  BibliographicName,
  BibliographyItem,
} from '@manuscripts/json-schema'
import {
  Data,
  Date,
  DateFieldKey,
  NumberFieldKey,
  Person,
  PersonFieldKey,
  StringFieldKey,
  // eslint-disable-next-line import/no-unresolved
} from 'csl-json'

const personFields: Array<PersonFieldKey> = [
  'author',
  'collection-editor',
  'composer',
  'container-author',
  'director',
  'editor',
  'editorial-director',
  'illustrator',
  'interviewer',
  'original-author',
  'recipient',
  'reviewed-author',
  'translator',
]

const dateFields: Array<DateFieldKey> = [
  'accessed',
  'container',
  'event-date',
  'issued',
  'original-date',
  'submitted',
]

const stringFields: Array<StringFieldKey> = [
  'abstract',
  'annote',
  'archive',
  'archive-place',
  'archive_location',
  'authority',
  'call-number',
  'citation-label',
  'citation-number',
  'collection-title',
  'container-title',
  'container-title-short',
  'dimensions',
  'DOI',
  'event',
  'event-place',
  'first-reference-note-number',
  'genre',
  'ISBN',
  'ISSN',
  'journalAbbreviation',
  'jurisdiction',
  'keyword',
  'language',
  'locator',
  'medium',
  'note',
  'number',
  'original-publisher',
  'original-publisher-place',
  'original-title',
  'page',
  'page-first',
  'PMCID',
  'PMID',
  'publisher',
  'publisher-place',
  'references',
  'reviewed-title',
  'scale',
  'section',
  'shortTitle',
  'source',
  'status',
  'title',
  'title-short',
  // 'type',
  'URL',
  'version',
  // 'volume',
  'year-suffix',
]

const numberFields: Array<NumberFieldKey> = [
  'chapter-number',
  // 'citation-number',
  'collection-number',
  'edition',
  'issue',
  // 'number',
  'number-of-pages',
  'number-of-volumes',
  'volume',
]

const isNumberFieldKey = (key: string): key is NumberFieldKey =>
  numberFields.includes(key as NumberFieldKey)

const isStringFieldKey = (key: string): key is StringFieldKey =>
  stringFields.includes(key as StringFieldKey)

const isPersonFieldKey = (key: string): key is PersonFieldKey =>
  personFields.includes(key as PersonFieldKey)

const isDateFieldKey = (key: string): key is DateFieldKey =>
  dateFields.includes(key as DateFieldKey)

export const convertBibliographyItemToCSL = (
  bibliographyItem: BibliographyItem
): Data =>
  Object.entries(bibliographyItem).reduce(
    (output, [key, item]) => {
      if (isNumberFieldKey(key)) {
        output[key] = Number.isInteger(item) ? item : String(item)
      } else if (isStringFieldKey(key)) {
        output[key] = String(item)
      } else if (isPersonFieldKey(key)) {
        output[key] = (item as BibliographicName[]).map((name) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, objectType, ...rest } = name
          return rest
        }) as Person[]
      } else if (isDateFieldKey(key)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, objectType, ...rest } = item as BibliographicDate
        output[key] = rest as Date
      }

      return output
    },
    {
      id: bibliographyItem._id,
      type: bibliographyItem.type || 'article-journal',
    } as Data
  )
