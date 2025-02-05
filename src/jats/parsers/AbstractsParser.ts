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
import { capitalizeFirstLetter } from '../importer/jats-parser-utils'
import { JatsParser } from './JatsParser'

export class AbstractsParser extends JatsParser {
  parser: DOMParser

  constructor(doc: Document, sectionCategories: SectionCategory[]) {
    super(doc, sectionCategories)
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

  parse(elements: Element[]) {
    const abstracts = this.createElement('abstracts')
    for (const element of elements) {
      abstracts.appendChild(this.createAbstractSection(element))
    }

    return this.parser.parse(abstracts, {
      topNode: this.schema.nodes.abstracts.create(),
    })
  }
  nodes: NodeRule[] = [
    {
      tag: 'sec[sec-type="abstract-graphical"]',
      node: 'graphical_abstract_section',
    },
  ]
}
