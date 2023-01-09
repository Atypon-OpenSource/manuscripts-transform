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

import { ObjectTypes, Submission } from '@manuscripts/json-schema'

export const submissions: Submission[] = [
  {
    _id: 'MPSubmission:1',
    manuscriptID: 'MPManuscript:8EB79C14-9F61-483A-902F-A0B8EF5973C9',
    containerID: 'MPProject:1',
    objectType: ObjectTypes.Submission,
    journalCode: 'foo',
    journalTitle: 'Foo',
    issn: '1111-1111',
    createdAt: 1000,
    updatedAt: 1000,
    sessionID: 'foo',
  },
  {
    _id: 'MPSubmission:2',
    manuscriptID: 'MPManuscript:8EB79C14-9F61-483A-902F-A0B8EF5973C9',
    containerID: 'MPProject:1',
    objectType: ObjectTypes.Submission,
    journalCode: 'bar',
    journalTitle: 'Bar',
    issn: '2222-2222',
    createdAt: 2000,
    updatedAt: 2000,
    sessionID: 'foo',
  },
]
