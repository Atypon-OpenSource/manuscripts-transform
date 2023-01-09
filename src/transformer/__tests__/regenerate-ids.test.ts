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

import { Model } from '@manuscripts/json-schema'
import fs from 'fs'
import JSZip from 'jszip'

import { updateAttachments, updateIdentifiers } from '../update-identifiers'

const buffer = fs.readFileSync(__dirname + '/data/example.manuproj')
const blob = new Blob([buffer])

const readProjectDumpFromArchive = async (
  zip: JSZip
): Promise<{ data: Model[] }> => {
  const json = await zip.files['index.manuscript-json'].async('text')

  return JSON.parse(json)
}

describe('regenerate ids', () => {
  test('regenerates all ids', async () => {
    const zip = await new JSZip().loadAsync(blob)
    const { data } = await readProjectDumpFromArchive(zip)

    const { idMap } = await updateIdentifiers(data)

    expect(idMap.size).toBe(131)

    const keys = [...idMap.keys()]
    expect(keys).toMatchSnapshot()

    const values = [...idMap.values()]
    expect(values).not.toEqual(keys)
  })

  test('updates attachment file names', async () => {
    const zip = await new JSZip().loadAsync(blob)
    const { data } = await readProjectDumpFromArchive(zip)

    const { idMap } = await updateIdentifiers(data)
    await updateAttachments(zip, idMap)

    const result = Object.keys(zip.files)

    expect(result).toHaveLength(5)

    expect(result).toContain('index.manuscript-json')
    expect(result).toContain('Data/')
    expect(result).toContain('containers.json')

    expect(result).not.toContain(
      'Data/MPBundle_D01D05F3-9C1F-4424-85C4-817969C0B2BC'
    )
    expect(result).not.toContain(
      'Data/MPFigure_3DD0D874-52DF-4D0B-A39D-A12C19337438'
    )
  })
})
