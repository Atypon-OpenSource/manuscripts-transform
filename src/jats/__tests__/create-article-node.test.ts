/*!
 * © 2024 Atypon Systems LLC
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

import { createArticleNode } from '../importer/create-article-node'
import { changeIDs } from './utils'

describe('Create empty document', () => {
  it('should create an empty document', () => {
    const doc = createArticleNode({
      id: 'manuscript:123',
      articleType: 'research-article',
    })
    changeIDs(doc)
    expect(doc).toMatchSnapshot()
  })

  it('should create a document with owner as contributor', () => {
    const doc = createArticleNode(
      {
        id: 'manuscript:456',
        articleType: 'research-article',
      },
      {
        email: 'owner@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        prefix: 'Dr.',
        orcid: '0000-0001-2345-6789',
      }
    )
    changeIDs(doc)
    expect(doc).toMatchSnapshot()
  })
})
