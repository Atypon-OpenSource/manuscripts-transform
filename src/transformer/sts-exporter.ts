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

import { Model } from '@manuscripts/manuscripts-json-schema'
import { DOMParser } from 'prosemirror-model'
import serializeToXML from 'w3c-xmlserializer'

import { JATSExporter } from '../jats/jats-exporter'
import { nodeFromHTML } from '../lib/html'
import { ManuscriptFragment, schema } from '../schema'
import { findManuscript } from './project-bundle'

const parser = DOMParser.fromSchema(schema)

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

export class STSExporter extends JATSExporter {
  public serializeToSTS = (
    fragment: ManuscriptFragment,
    modelMap: Map<string, Model>
  ): string => {
    this.modelMap = modelMap

    this.createSerializer()

    this.document = document.implementation.createDocument(
      null,
      'standard',
      document.implementation.createDocumentType(
        'standard',
        '-//NISO//DTD NISO STS Extended Tag Set (NISO STS) DTD with OASIS and XHTML Tables with MathML 2.0 v1.0 20171031//EN',
        'NISO-STS-extended-1-mathml2.dtd'
      )
    )

    const standard = this.document.documentElement

    standard.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      XLINK_NAMESPACE
    )

    standard.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:mml',
      MATHML_NAMESPACE
    )

    const front = this.buildFront()
    standard.appendChild(front)

    const body = this.buildBody(fragment)
    standard.appendChild(body)

    // const back = this.buildBack()
    // standard.appendChild(back)
    //
    // this.moveAbstract(front, body)

    return serializeToXML(this.document)
  }

  protected buildFront = () => {
    const manuscript = findManuscript(this.modelMap)

    const front = this.document.createElement('front')

    const standardMeta = this.document.createElement('std-doc-meta')
    front.appendChild(standardMeta)

    const titleWrap = this.document.createElement('title-wrap')
    standardMeta.appendChild(titleWrap)

    const mainTitleWrap = this.document.createElement('main-title-wrap')
    titleWrap.appendChild(mainTitleWrap)

    if (manuscript.title) {
      const htmlTitleNode = nodeFromHTML(`<h1>${manuscript.title}</h1>`)

      if (htmlTitleNode) {
        // TODO: parse and serialize with title schema
        const titleNode = parser.parse(htmlTitleNode, {
          topNode: schema.nodes.section_title.create(),
        })

        const stsTitleNode = this.serializeNode(titleNode)

        const main = this.document.createElement('main')

        while (stsTitleNode.firstChild) {
          main.appendChild(stsTitleNode.firstChild)
        }

        mainTitleWrap.appendChild(main)
      }
    }

    return front
  }
}
