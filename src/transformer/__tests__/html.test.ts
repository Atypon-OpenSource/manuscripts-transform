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

import projectDump from '../../__tests__/data/project-dump.json'
import projectDump2 from '../../__tests__/data/project-dump-2.json'
import projectDump3 from '../../__tests__/data/project-dump-3.json'
import projectDump5 from '../../__tests__/data/project-dump-5.json'
import { HTMLTransformer } from '../html'
import { parseProjectBundle, ProjectBundle } from '../project-bundle'

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('html', () => {
  test('export', async () => {
    const { doc, modelMap } = parseProjectBundle(projectDump as ProjectBundle)

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(doc.content, modelMap)

    expect(result).toMatchSnapshot('html-export')
  })

  // html export is not maintained at the moment
  test.skip('export with citations to fix', async () => {
    const { doc, modelMap } = parseProjectBundle(projectDump2 as ProjectBundle)

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(doc.content, modelMap)

    expect(result).toMatchSnapshot('html-export-citations')
  })

  test('export one manuscript from a bundle with multiple', async () => {
    const { doc, modelMap } = parseProjectBundle(
      projectDump3 as ProjectBundle,
      'MPManuscript:BCEB682E-C475-4BF7-9470-D6194D3EF0D8'
    )

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(doc.content, modelMap)

    expect(result).toMatchSnapshot('multi-manuscript-html-export')
  })

  test('custom attachment URL', async () => {
    const { doc, modelMap } = parseProjectBundle(
      projectDump as unknown as ProjectBundle
    )

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(doc.content, modelMap, {
      mediaPathGenerator: async (element) => {
        const src = element.getAttribute('src')

        if (!src) {
          throw new Error('Media element has no src value')
        }

        return `http://example.com/${src}`
      },
    })

    expect(result).toMatchSnapshot('html-export-custom-url')
  })

  // html export is not maintained at the moment
  test.skip('export with cross-references', async () => {
    const { doc, modelMap } = parseProjectBundle(
      projectDump5 as unknown as ProjectBundle
    )

    const transformer = new HTMLTransformer()
    const result = await transformer.serializeToHTML(doc.content, modelMap)

    expect(result).toMatchSnapshot('html-export-cross-references')
  })
})
