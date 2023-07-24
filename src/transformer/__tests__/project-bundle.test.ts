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

// @ts-ignore
import project3 from '@manuscripts/examples/data/project-dump-3.json'

import { parseProjectBundle, ProjectBundle } from '../project-bundle'

test('project bundle with no manuscript parameter', () => {
  const result = parseProjectBundle(project3)
  expect(result).toMatchSnapshot('project-bundle')
})

test('project bundle for a specific manuscript', () => {
  const result = parseProjectBundle(
    project3 as ProjectBundle,
    'MPManuscript:BCEB682E-C475-4BF7-9470-D6194D3EF0D8'
  )
  expect(result).toMatchSnapshot('multimanuscript-project-bundle')
})
