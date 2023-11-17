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

import { ObjectTypes } from '@manuscripts/json-schema'

import { Decoder } from '../decode'
import { encode } from '../encode'
import { createTestModelMap } from './__helpers__/doc'

test('transformer', async () => {
  const input = createTestModelMap()
  const decoder = new Decoder(input)
  const doc = decoder.createArticleNode()
  const output = encode(doc)

  for (const [id, item] of input.entries()) {
    if (output.has(id)) {
      output.set(id, {
        ...output.get(id),
        ...item, // Swap the order to ensure item properties override output properties
      });
    } else {
      output.set(id, item);
    }
  }

  for (const [id, item] of output.entries()) {
    // ignore TOCElement as the classes are different
    if (item.objectType === ObjectTypes.TOCElement) {
      continue
    }

    for (const [key, value] of Object.entries(item)) {
      if (value === undefined || value === null) {
        // @ts-ignore
        delete item[key]
      }
    }

    const original = input.get(id)
    if (!original) {
      continue
    }
    // @ts-ignore
    delete original.originalURL

    // TODO remove 2 deletions below after updating the manuscripts-examples repo
    // @ts-ignore
    delete original.caption
    // @ts-ignore
    delete item.caption

    expect(item).toEqual(original)
  }
})
