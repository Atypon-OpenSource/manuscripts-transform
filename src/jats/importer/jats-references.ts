/*!
 * © 2023 Atypon Systems LLC
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
import { BibliographyItem } from '@manuscripts/json-schema'

export class References {
  items: Map<string, BibliographyItem>
  IDs: Map<string, string>

  constructor() {
    this.items = new Map()
    this.IDs = new Map()
  }

  public add(item: BibliographyItem, id: string | null) {
    this.items.set(item._id, item)
    if (id) {
      this.IDs.set(id, item._id)
    }
  }

  public getBibliographyItems(): BibliographyItem[] {
    return [...this.items.values()]
  }
}
