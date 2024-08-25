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

import { ObjectTypes, Requirement } from '@manuscripts/json-schema'

import { Decoder, encode } from '../../transformer'
import { parseJATSArticle } from '../importer'
import {
  betamonyParser,
  createAffiliationsNode,
  createAuthorNotesNode,
  createAuthorsNode,
  createTitleNode,
} from '../importer/jats-front-dom-parser'
// import { jatsFrontTransformations } from '../importer/jats-front-transformations'
import { JATSExporter } from '../jats-exporter'
import { DEFAULT_CSL_OPTIONS } from './citations'
import { readAndParseFixture } from './files'

// eslint-disable-next-line jest/expect-expect
test('custom test', async () => {
  const models = parseJATSArticle(await readAndParseFixture('jats-import.xml'))

  const modelMap = new Map<string, Requirement>()
  let id = ''
  for (const model of models) {
    const req = model as Requirement
    req.createdAt = Date.now()
    req.updatedAt = Date.now()
    req.manuscriptID = 'MPManuscript:E3830344-E77B-42BA-BD77-3E95489712A0'
    req.containerID = 'MPProject:1'
    modelMap.set(model._id, req)
    if (model.objectType === 'MPManuscript') {
      id = model._id
    }
  }

  const decoder = new Decoder(modelMap)
  const node = decoder.createArticleNode()
  const encodedValue = encode(node)
  const encodedModelMap = encodedValue.values()

  const jatsExpoerter = new JATSExporter()
  const xml = await jatsExpoerter.serializeToJATS(node.content, modelMap, id, {
    csl: DEFAULT_CSL_OPTIONS,
  })
  // console.log(xml)
})

// eslint-disable-next-line jest/expect-expect
// test('custom test 2', async () => {
//   const doc = await readAndParseFixture('jats-import.xml')
//   const front = doc.querySelector('front')
//   if (!front) {
//     return
//   }

//   const newFront = document.createElement('front')
//   // const title = createTitleNode(doc)
//   // const affiliations = createAffiliationsNode(doc)
//   // const authorNotes = createAuthorNotesNode(doc)
//   // const authors = createAuthorsNode(doc)

//   // const node = [title, authors, affiliations, authorNotes]

//   //readl order -=> title, authors, affiliations, authornotes

//   jatsFrontTransformations.createTitle(doc, newFront)
//   jatsFrontTransformations.createAffiliations(doc, newFront)
//   jatsFrontTransformations.createAuthorNotes(doc, newFront)
//   jatsFrontTransformations.createContributors(doc, newFront)
//   const node = betamonyParser.parse(newFront)
//   console.log('he')
// })

function testing(doc: Document) {
  // this is what happens now:
  const models = parseJATSArticle(doc)
  // find the manuscript model
  const manuscript = models.find((m) => m.objectType === ObjectTypes.Manuscript)
  /*
   models = models.map((m) => {
     const updated = {
       ...m,
       createdAt: now,
       updatedAt: now,
       containerID: projectID,
     }

     why doesn't pressroom already include manuscriptID?
     if (manuscriptIDTypes.has(m.objectType)) {
       @ts-ignore
       updated.manuscriptID = manuscript._id
     }

     return updated
   })*/

  /*
      manuscript = models.find((m) => m.objectType === ObjectTypes.Manuscript) as Manuscript
    if (templateID) {
      manuscript.prototype = templateID
    }
     */
}
