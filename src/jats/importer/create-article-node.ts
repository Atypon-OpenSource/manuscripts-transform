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

import { ObjectTypes } from '@manuscripts/json-schema'
import { Fragment } from 'prosemirror-model'

import { ManuscriptAttrs, ManuscriptNode, schema } from '../../schema'
import { generateNodeID } from '../../transformer'

export interface SubmissionOwner {
  email?: string
  firstName?: string
  lastName?: string
  prefix?: string
  orcid?: string
}

export const createArticleNode = (
  attrs: Partial<ManuscriptAttrs> & { id: string },
  submissionOwner?: SubmissionOwner
): ManuscriptNode => {
  const title = schema.nodes.title.createChecked({
    id: generateNodeID(schema.nodes.title),
  })
  const abstracts = schema.nodes.abstracts.createChecked({
    id: generateNodeID(schema.nodes.abstracts),
  })
  const paragraph = schema.nodes.paragraph.createChecked({
    id: generateNodeID(schema.nodes.paragraph),
  })
  const body = schema.nodes.body.createChecked(
    {
      id: generateNodeID(schema.nodes.body),
    },
    paragraph
  )
  const backmatter = schema.nodes.backmatter.createChecked({
    id: generateNodeID(schema.nodes.backmatter),
  })
  const comments = schema.nodes.comments.createChecked({
    id: generateNodeID(schema.nodes.comments),
  })

  let contributors

  if (submissionOwner) {
    const contributor = schema.nodes.contributor.createChecked(
      {
        id: generateNodeID(schema.nodes.contributor),
        email: submissionOwner.email || '',
        bibliographicName: {
          given: submissionOwner.firstName || '',
          family: submissionOwner.lastName || '',
          ObjectType: ObjectTypes.BibliographicName,
        },
        ORCIDIdentifier: submissionOwner.orcid,
        prefix: submissionOwner.prefix || '',
        isCorresponding: true,
        priority: 0,
        affiliations: [],
        footnote: [],
        corresp: [],
      },
      Fragment.from(schema.text('_'))
    )
    contributors = schema.nodes.contributors.createChecked(
      { id: generateNodeID(schema.nodes.contributors) },
      contributor
    )
  }

  const children = [
    title,
    contributors,
    abstracts,
    body,
    backmatter,
    comments,
  ].filter((node) => node !== undefined)

  return schema.nodes.manuscript.createChecked(attrs, children)
}
