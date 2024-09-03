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
import {
  AffiliationNode,
  getTrimmedTextContent,
  ManuscriptNode,
} from 'migration-base'
import { DOMParser, Fragment, ParseOptions, ParseRule } from 'prosemirror-model'
import serializeToXML from 'w3c-xmlserializer'

import { ContributorNode, Nodes, schema } from '../../schema'
import { generateID } from '../../transformer'

export type NodeRule = ParseRule & { node?: Nodes | null }
const nodes: NodeRule[] = [
  {
    tag: 'article-title',
    node: 'title',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'p',
    node: 'paragraph',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'fn',
    node: 'footnote',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        kind: 'footnote',
      }
    },
    getContent: (node) => {
      const paragraphs: ManuscriptNode[] = []
      node.childNodes.forEach((p) => {
        const paragraph = schema.nodes.paragraph.create()
        const content = frontDOMparser.parse(p, {
          topNode: paragraph,
        })
        paragraphs.push(content)
      })
      return Fragment.from([...paragraphs]) as Fragment
    },
  },

  {
    tag: 'affiliations',
    node: 'affiliations',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'affiliation',
    node: 'affiliation',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const emailText = element.getAttribute('email-text') || undefined
      const emailHref = element.getAttribute('email-href') || undefined
      const email = {
        href: emailHref,
        text: emailText,
      }
      return {
        id: element.getAttribute('id'),
        institution: element.getAttribute('institution'),
        department: element.getAttribute('department'),
        addressLine1: element.getAttribute('addressLine1'),
        addressLine2: element.getAttribute('addressLine2'),
        addressLine3: element.getAttribute('addressLine3'),
        postCode: element.getAttribute('postCode'),
        country: element.getAttribute('country'),
        email: email,
        priority: element.getAttribute('priority'),
      }
    },
    getContent: () => {
      return Fragment.from(schema.text('_'))
    },
  },

  {
    tag: 'author-notes-title',
    node: 'section_title',
  },
  {
    tag: 'author-notes',
    node: 'author_notes',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'corresp',
    node: 'corresp',
    getAttrs: (node) => {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
        label: element.querySelector('label'),
      }
    },
    getContent: (node) => {
      const element = node as HTMLElement
      return Fragment.from(schema.text(element.textContent?.trim() || ''))
    },
  },
  {
    tag: ' contributors',
    node: 'contributors',
    getAttrs(node) {
      const element = node as HTMLElement
      return {
        id: element.getAttribute('id'),
      }
    },
  },
  {
    tag: 'contributor',
    node: 'contributor',
    getAttrs: (node) => {
      const element = node as HTMLElement
      const footnotes = []
      const affs = []
      const corresps = []
      element.querySelectorAll('fn').forEach((fn) => {
        footnotes.push({
          noteID: fn.getAttribute('noteID'),
          noteLabel: fn.getAttribute('noteLabel'),
        })
      })

      element.querySelectorAll('corresp').forEach((corresp) => {
        corresps.push({
          correspLabel: corresp.getAttribute('correspLabel'),
          correspID: corresp.getAttribute('correspID'),
        })
      })

      element.querySelectorAll('affiliation').forEach((aff) => {
        affs.push(aff.getAttribute('affiliationID'))
      })

      return {
        id: element.getAttribute('id'),
        role: element.getAttribute('role'),
        isCorresponding: element.getAttribute('isCorresponding'),
        bibliographicName: {
          given: element.getAttribute('given'),
          family: element.getAttribute('family'),
          ObjectType: 'MPBibliographicName',
          _id: generateID(ObjectTypes.BibliographicName),
        },
        affiliations: element.querySelectorAll('affiliations'),
        ORCIDIdentifier: element.getAttribute('ORCIDIdentifier'),
        priority: element.getAttribute('priority'),
      }
    },
  },
]

export const betamonyParser = new DOMParser(schema, nodes)

function createAuthorNode(element: Element, priority: number) {
  const nodeID = generateID(ObjectTypes.Contributor)
  const givenEl = getTrimmedTextContent(element, 'name > given-names')
  let given, family
  if (givenEl) {
    given = givenEl
  }
  const surname = getTrimmedTextContent(element, 'name > surname')
  if (surname) {
    family = surname
  }
  const correspEl = element.getAttribute('corresp') === 'yes'
  let isCorresponding
  if (correspEl) {
    isCorresponding = correspEl
  }

  const orcid = getTrimmedTextContent(
    element,
    'contrib-id[contrib-id-type="orcid"]'
  )
  let ORCIDIdentifier
  if (orcid) {
    ORCIDIdentifier = orcid
  }
  const xrefs = element.querySelectorAll('xref')
  const footnotes = []
  const corresps = []
  let affs
  for (const xref of xrefs) {
    const rid = xref.getAttribute('rid')
    const type = xref.getAttribute('ref-type')
    if (rid) {
      //check the xref note type, if fn(footnote) then map the note content and id in array
      if (type === 'fn') {
        const footnoteID = idsMap.get(rid)
        if (footnoteID) {
          const authorFootNoteRef = {
            noteID: footnoteID,
            noteLabel: xref.textContent?.trim() || '',
          }
          footnotes.push(authorFootNoteRef)
        }
      } else if (type === 'corresp') {
        const correspID = idsMap.get(rid)
        if (correspID) {
          const authorCorrespRef = {
            correspID: correspID,
            correspLabel: xref.textContent?.trim() || '',
          }
          corresps.push(authorCorrespRef)
        }
      } else if (type === 'aff') {
        const rids = rid
          .split(/\s+/)
          .map((id) => idsMap.get(id))
          .filter(Boolean) as string[]
        if (rids.length) {
          affs = rids
        }
      }
    }
  }
  return schema.nodes.contributor.create(
    {
      id: nodeID,
      role: 'author',
      affiliations: affs,
      bibliographicName: {
        given,
        family,
        ObjectType: 'MPBibliographicName',
        _id: generateID(ObjectTypes.BibliographicName),
      },
      isCorresponding,
      ORCIDIdentifier,
      footnote: footnotes,
      corresp: corresps,
      priority,
    },
    schema.text('_') // placeholder to ensure correct track-changes functioning
  ) as ContributorNode
}

export function createAuthorsNode(doc: Document) {
  const contribs = doc.querySelectorAll(
    'article-meta > contrib-group > contrib[contrib-type="author"]'
  )
  const authors: ContributorNode[] = []
  Array.from(contribs).forEach((element, priority) => {
    const author = createAuthorNode(element, priority)
    authors.push(author)
  })

  return authors.length == 0
    ? false
    : (schema.nodes.contributors.createAndFill({}, authors) as ManuscriptNode)
}

function createCorrespNode(element: Element) {
  const labelEl = element.querySelector('label')
  if (labelEl) {
    labelEl.remove()
  }
  const label = labelEl?.textContent?.trim() || undefined
  const nodeID = generateID(ObjectTypes.Corresponding)
  const id = element.getAttribute('id')
  const text = element.textContent?.trim() || ''
  if (id) {
    idsMap.set(id, nodeID)
  }
  return schema.nodes.corresp.createChecked(
    {
      label,
      id: nodeID,
    },
    schema.text(text)
  )
}
export function createAuthorNotesNode(doc: Document) {
  const authorNotesEl = doc.querySelector('article-meta > author-notes')
  //handle empty authornotes
  if (!authorNotesEl) {
    return
  }
  const title = schema.nodes.section_title.create(
    {},
    schema.text('Correspondence')
  )

  const corresps = authorNotesEl.querySelectorAll('corresp')
  const footnotes = authorNotesEl.querySelectorAll('fn:not([fn-type])')
  const paragraphs = authorNotesEl.querySelectorAll(':scope > p')
  const correspsNodes = Array.from(corresps).map(createCorrespNode)
  const footnotesNodes = Array.from(footnotes).map(createFootnoteNode)
  const paragraphsNodes = Array.from(paragraphs).map(createParagraphNode)
  const content = [
    title,
    ...correspsNodes,
    ...footnotesNodes,
    ...paragraphsNodes,
  ]
  const nodeID = generateID(ObjectTypes.AuthorNotes)
  return schema.nodes.author_notes.createAndFill(
    {
      id: nodeID,
    },
    content
  )
}
function createAffiliationNode(element: Element, priority: number) {
  let department
  let institution
  for (const el of element.querySelectorAll('institution')) {
    const content = el.textContent?.trim()
    if (!content) {
      continue
    }
    const type = el.getAttribute('content-type')
    if (type === 'dept') {
      department = content
    } else {
      institution = content
    }
  }
  const addressLine1 = getTrimmedTextContent(
    element,
    'addr-line:nth-of-type(1)'
  )
  const addressLine2 = getTrimmedTextContent(
    element,
    'addr-line:nth-of-type(2)'
  )
  const addressLine3 = getTrimmedTextContent(
    element,
    'addr-line:nth-of-type(3)'
  )
  const postCode = getTrimmedTextContent(element, 'postal-code')
  const country = getTrimmedTextContent(element, 'country')
  const emailEl = element.querySelector('email')
  let email
  if (emailEl) {
    email = {
      href: emailEl.getAttributeNS(XLINK_NAMESPACE, 'href') || undefined,
      text: emailEl.textContent?.trim() || undefined,
    }
  }
  const id = element.getAttribute('id')
  const nodeID = generateID(ObjectTypes.Affiliation)
  if (id) {
    idsMap.set(id, nodeID)
  }

  return schema.nodes.affiliation.createChecked(
    {
      id: nodeID,
      institution: institution,
      addressLine1: addressLine1,
      addressLine2: addressLine2,
      addressLine3: addressLine3,
      postCode: postCode,
      country: country,
      email: email,
      department: department,
      priority: priority,
    },
    schema.text('_') // placeholder to ensure correct track-changes functioning
  ) as AffiliationNode
}
export const frontDOMparser = new DOMParser(schema, nodes)

const idsMap = new Map<string, string>()
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const defaultTitle = 'Untitled Manuscript'

export function createTitleNode(doc: Document) {
  const titleEl = doc.querySelector(
    'article-meta > title-group > article-title'
  )
  const title =
    titleEl && titleEl.textContent ? titleEl.textContent : defaultTitle

  const node = schema.nodes.title.createChecked(
    {
      id: generateID(ObjectTypes.Titles),
    },
    schema.text(title)
  )
  return node
}

export function createAffiliationsNode(doc: Document) {
  const affiliations = doc.querySelectorAll(
    'article-meta > contrib-group > aff'
  )
  const content: AffiliationNode[] = []
  affiliations.forEach((affiliation, priority) => {
    const node = createAffiliationNode(affiliation, priority)
    content.push(node)
  })
  return schema.nodes.affiliations.createAndFill({}, content)
}

function createParagraphNode(element: Element) {
  const nodeID = generateID(ObjectTypes.ParagraphElement)
  const elementNS = document.createElementNS(null, 'p')
  if (element.innerHTML) {
    elementNS.innerHTML = element.innerHTML
  }
  const contents = serializeToXML(elementNS)
  return parseContents(contents || '<p></p>', undefined, {
    topNode: schema.nodes.paragraph.create({
      id: nodeID,
    }),
  })
}
function createFootnoteNode(element: Element) {
  const content = element.innerHTML
  const kind = 'footnote'
  const nodeID = generateID(ObjectTypes.Footnote)
  const id = element.getAttribute('id')
  if (id) {
    idsMap.set(id, nodeID)
  }
  return parseContents(content || '<div></div>', undefined, {
    topNode: schema.nodes.footnote.create({
      id: nodeID,
      kind,
    }),
  })
}

const parser = DOMParser.fromSchema(schema)

const parseContents = (
  contents: string,
  wrapper?: string,
  options?: ParseOptions
): ManuscriptNode => {
  const wrappedContents = wrapper
    ? `<${wrapper}>${contents}</${wrapper}>`
    : contents

  const html = wrappedContents.trim()

  if (!html.length) {
    throw new Error('No HTML to parse')
  }

  const template = document.createElement('template')
  template.innerHTML = html

  if (!template.content.firstElementChild) {
    throw new Error('No content could be parsed')
  }

  return parser.parse(template.content.firstElementChild, options)
}

export function createFrontNode(doc: Document) {}
