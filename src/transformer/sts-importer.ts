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

import { Model, ObjectTypes } from '@manuscripts/manuscripts-json-schema'

import { parseJATSBody } from '../jats/importer'
import { ManuscriptNode } from '../schema'
import { Build, buildManuscript } from './builders'
import { encode } from './encode'
import { generateID } from './id'

export const parseSTSFront = (front: Element) => {
  const title = front.querySelector(
    'std-doc-meta > title-wrap > main-title-wrap > main'
  )?.textContent
  return generateModelIDs([buildManuscript(title || undefined)])
}

// https://www.niso-sts.org/TagLibrary/niso-sts-TL-1-0-html/index.html
// TODO: STS-specific rules
export const parseSTSBody = (
  document: Document,
  body: Element,
  bibliography: Element | null,
  refModels: Model[]
): ManuscriptNode =>
  parseJATSBody(document, body, bibliography, refModels, null)

const generateModelIDs = (models: Build<Model>[]) =>
  models.map((m) =>
    m._id ? m : { ...m, _id: generateID(m.objectType as ObjectTypes) }
  ) as Model[]

export const parseSTSStandard = async (doc: Document): Promise<Model[]> => {
  const front = doc.querySelector('front')
  const body = doc.querySelector('body')
  if (!front || !body) {
    throw Error('Invalid STS format! Missing body or front element')
  }
  const frontModels = parseSTSFront(front)
  const node = parseSTSBody(doc, body, null, frontModels)
  const bodyModels = encode(node).values()

  return [...frontModels, ...bodyModels]
}
