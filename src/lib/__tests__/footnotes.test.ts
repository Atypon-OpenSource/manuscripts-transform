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
import {
  generateAlphaFootnoteLabel,
  generateNumericFootnoteLabel,
} from '../footnotes'

describe('Footnotes alpha label generation', () => {
  it('should start from "a"', () => {
    const label = generateAlphaFootnoteLabel(0)
    expect(label).toBe('a')
  })
  it('should generate 2 characters for large indexes', () => {
    const label = generateAlphaFootnoteLabel(26)
    expect(label).toBe('aa')
  })
})
describe('Footnotes numeric label generation', () => {
  it('should start from "1"', () => {
    const label = generateNumericFootnoteLabel(0)
    expect(label).toBe('1')
  })
})
