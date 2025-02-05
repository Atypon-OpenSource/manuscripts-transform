/*!
 * © 2025 Atypon Systems LLC
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
import { DOMParser } from 'prosemirror-model'

import { NodeRule, SectionCategory } from '../../schema'
import { JatsParser } from './JatsParser'

export class BodyParser extends JatsParser {
  parser: DOMParser

  constructor(doc: Document, sectionCategories: SectionCategory[]) {
    super(doc, sectionCategories)
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.allNodes])
  }

  parse(element: Element | null) {
    if (!element) {
      return
    }
    return this.parser.parse(element, {
      topNode: this.schema.nodes.body.create(),
    })
  }
  nodes: NodeRule[] = []
}
