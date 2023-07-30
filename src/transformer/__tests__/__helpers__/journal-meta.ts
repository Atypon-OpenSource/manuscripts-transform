/*!
 * © 2021 Atypon Systems LLC
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

export const journalMeta: Journal = {
  _id: 'MPJournal:1',
  manuscriptID: 'MPManuscript:8EB79C14-9F61-483A-902F-A0B8EF5973C9',
  containerID: 'MPProject:1',
  objectType: 'MPJournal',
  updatedAt: 1,
  createdAt: 1,
  ISSNs: [{ ISSN: '123-45', publicationType: 'print' }],
  abbreviatedTitles: [{ abbreviatedTitle: 'title', abbrevType: 'publisher' }],
  journalIdentifiers: [{ journalID: 'Some id', journalIDType: 'pmc' }],
  title: 'journal title',
  publisherName: 'publisher',
  submittable: false,
}
