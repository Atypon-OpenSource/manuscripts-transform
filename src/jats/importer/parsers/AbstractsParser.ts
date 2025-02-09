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

import { NodeRule } from '../../../schema'
import { capitalizeFirstLetter } from '../jats-parser-utils'
import { JatsParser } from './JatsParser'

export class AbstractsParser extends JatsParser {
  private readonly tag = 'front > article-meta > abstract'

  protected initParser(): void {
    this.parser = new DOMParser(this.schema, [...this.marks, ...this.allNodes])
  }

  createAbstractSection = (abstract: Element) => {
    const abstractType = abstract.getAttribute('abstract-type')

    const section = this.createElement('sec')
    const sectionType = abstractType ? `abstract-${abstractType}` : 'abstract'
    section.setAttribute('sec-type', sectionType)

    if (!abstract.querySelector(':scope > title')) {
      const title = this.createElement('title')
      title.textContent = abstractType
        ? `${capitalizeFirstLetter(abstractType)} Abstract`
        : 'Abstract'
      section.appendChild(title)
    }

    while (abstract.firstChild) {
      section.appendChild(abstract.firstChild)
    }
    return section
  }

  parse() {
    const elements = Array.from(this.doc.querySelectorAll(this.tag))
    const abstracts = this.createElement('abstracts')
    for (const element of elements) {
      abstracts.appendChild(this.createAbstractSection(element))
    }

    return this.parser.parse(abstracts, {
      topNode: this.schema.nodes.abstracts.create(),
    })
  }
  protected get nodes(): NodeRule[] {
    return [
      {
        tag: 'sec[sec-type="abstract-graphical"]',
        node: 'graphical_abstract_section',
      },
    ]
  }
}
