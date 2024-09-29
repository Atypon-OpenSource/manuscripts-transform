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

import { findChildrenByAttr, findChildrenByType } from 'prosemirror-utils'

import { defaultTitle } from '../../lib/deafults'
import {
  ContributorCorresp,
  ContributorFootnote,
  ManuscriptNode,
  ManuscriptNodeType,
  schema,
} from '../../schema'
import { markComments } from '../importer/jats-comments'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { readAndParseFixture } from './files'
import { changeIDs, createNodeFromJATS } from './utils'

const countDescendantsOfType = (
  node: ManuscriptNode,
  type: ManuscriptNodeType
) => {
  return findChildrenByType(node, type).length
}
const removeExtraWhitespace = (text: string) => {
  return text.replace(/\s+/g, ' ').trim()
}
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

describe('JATS importer', () => {
  describe('title node', () => {
    it('should have title node with content if title element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const titleEl = jats.querySelector(
        'article-meta > title-group > article-title'
      )
      if (!titleEl) {
        throw new Error('Title element not found')
      }
      const { node } = parseJATSArticle(jats)
      const titleNode = findChildrenByType(node, schema.nodes.title)[0]?.node
      expect(titleNode).toBeDefined()
      expect(titleNode.textContent).toBe(
        removeExtraWhitespace(titleEl.textContent ?? '')
      )
    })
    it('should have title node with default content if title element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const titleEl = jats.querySelector(
        'article-meta > title-group > article-title'
      )
      titleEl?.remove()
      const { node } = parseJATSArticle(jats)
      const titleNode = findChildrenByType(node, schema.nodes.title)[0]?.node
      expect(titleNode).toBeDefined()
      expect(titleNode.textContent).toBe(defaultTitle)
    })
  })
  describe('contributors node', () => {
    it('should have contributors node with content if contributors element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const contributorsEl = jats.querySelector('article-meta > contrib-group')
      if (!contributorsEl) {
        throw new Error('Contributors element not found')
      }
      const contributors = contributorsEl.querySelectorAll(
        'contrib[contrib-type="author"]'
      )
      const { node } = parseJATSArticle(jats)
      const contributorsNode = findChildrenByType(
        node,
        schema.nodes.contributors
      )[0]?.node
      expect(node).toBeDefined()
      expect(contributorsNode).toBeDefined()
      expect(
        countDescendantsOfType(contributorsNode, schema.nodes.contributor)
      ).toBe(contributors.length)
    })
    it('should correctly parse contributor nodes', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const contributorsEl = jats.querySelector('article-meta > contrib-group')
      if (!contributorsEl) {
        throw new Error('Contributors element not found')
      }
      const contributors = contributorsEl.querySelectorAll(
        'contrib[contrib-type="author"]'
      )
      const { node } = parseJATSArticle(jats)
      const contributorNodes = findChildrenByType(
        node,
        schema.nodes.contributor
      )
      expect(contributorNodes).toHaveLength(contributors.length)
      contributorNodes.forEach(({ node: contributorNode }, priority) => {
        const contributorEl = contributors[priority]
        const role = 'author'
        const isCorresponding = contributorEl.getAttribute('corresp')
          ? contributorEl.getAttribute('corresp') === 'yes'
          : undefined
        const ORCIDIdentifier = contributorEl.querySelector(
          'contrib-id[contrib-id-type="orcid"]'
        )
        const bibliographicName = {
          given: contributorEl.querySelector('given-names')?.textContent,
          family: contributorEl.querySelector('surname')?.textContent,
        }
        expect(contributorNode.attrs.role).toBe(role)
        expect(contributorNode.attrs.isCorresponding).toBe(isCorresponding)
        expect(contributorNode.attrs.ORCIDIdentifier).toBe(
          ORCIDIdentifier?.textContent?.trim()
        )
        expect(contributorNode.attrs.bibliographicName.given).toEqual(
          bibliographicName.given
        )
        expect(contributorNode.attrs.bibliographicName.family).toEqual(
          bibliographicName.family
        )

        contributorNode.attrs.affiliations.forEach((affiliation: string) => {
          expect(
            findChildrenByAttr(node, (attrs) => attrs.id === affiliation)
          ).toHaveLength(1)
        })
        contributorNode.attrs.footnote.forEach(
          (footnote: ContributorFootnote) => {
            expect(
              findChildrenByAttr(node, (attrs) => attrs.id === footnote.noteID)
            ).toHaveLength(1)
          }
        )
        contributorNode.attrs.corresp.forEach((corresp: ContributorCorresp) => {
          expect(
            findChildrenByAttr(node, (attrs) => attrs.id === corresp.correspID)
          ).toHaveLength(1)
        })
      })
    })
    it('should not have contributors node or contributor nodes if contributors element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const contributorsEl = jats.querySelector('article-meta > contrib-group')
      contributorsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const contributorsNode = findChildrenByType(
        node,
        schema.nodes.contributors
      )[0]?.node
      const contributorNodes = findChildrenByType(
        node,
        schema.nodes.contributor
      )
      expect(contributorNodes).toHaveLength(0)
      expect(contributorsNode).toBeUndefined()
    })
  })
  describe('affiliations', () => {
    it('should have affiliations node with content if affiliations element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const affiliationsElements = jats.querySelectorAll(
        'article-meta > contrib-group > aff'
      )
      if (!affiliationsElements.length) {
        throw new Error('Affiliations found')
      }
      const { node } = parseJATSArticle(jats)
      const affiliationNode = findChildrenByType(
        node,
        schema.nodes.affiliation
      )[0]?.node
      expect(affiliationNode).toBeDefined()
      expect(countDescendantsOfType(node, schema.nodes.affiliation)).toBe(
        affiliationsElements.length
      )
    })
    it('should correctly parse affiliation nodes', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const affiliationsElements = jats.querySelectorAll(
        'article-meta > contrib-group > aff'
      )
      if (!affiliationsElements.length) {
        throw new Error('Affiliations not found')
      }
      const { node } = parseJATSArticle(jats)
      const affiliationNodes = findChildrenByType(
        node,
        schema.nodes.affiliation
      )
      expect(affiliationNodes).toHaveLength(affiliationsElements.length)
      affiliationNodes.forEach((affiliationNode, priority) => {
        const affiliationEl = affiliationsElements[priority]
        const email = affiliationEl.querySelector('email')
          ? {
              href: affiliationEl.querySelector('email')?.getAttribute('href'),
              text: affiliationEl.querySelector('email')?.textContent,
            }
          : undefined
        let department = ''
        let institution = ''
        for (const node of affiliationEl.querySelectorAll('institution')) {
          const content = node.textContent?.trim()
          if (!content) {
            continue
          }
          const type = node.getAttribute('content-type')
          if (type === 'dept') {
            department = content
          } else {
            institution = content
          }
        }
        const addressLine1 =
          affiliationEl.querySelector('addr-line:nth-of-type(1)')
            ?.textContent || ''
        const addressLine2 =
          affiliationEl.querySelector('addr-line:nth-of-type(2)')
            ?.textContent || ''
        const addressLine3 =
          affiliationEl.querySelector('addr-line:nth-of-type(3)')
            ?.textContent || ''

        const postCode =
          affiliationEl.querySelector('postal-code')?.textContent || ''
        const country =
          affiliationEl.querySelector('country')?.textContent || ''

        expect(affiliationNode.node.attrs.email).toEqual(email)
        expect(affiliationNode.node.attrs.department).toEqual(department)
        expect(affiliationNode.node.attrs.institution).toEqual(institution)
        expect(affiliationNode.node.attrs.addressLine1).toEqual(addressLine1)
        expect(affiliationNode.node.attrs.addressLine2).toEqual(addressLine2)
        expect(affiliationNode.node.attrs.addressLine3).toEqual(addressLine3)
        expect(affiliationNode.node.attrs.postCode).toEqual(postCode)
        expect(affiliationNode.node.attrs.country).toEqual(country)
      })
    })
    it('should not have affiliations node or affiliation nodes if affiliations element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const affiliationsElements = jats.querySelectorAll(
        'article-meta > contrib-group > aff'
      )
      affiliationsElements.forEach((aff) => {
        aff.remove()
      })
      const { node } = parseJATSArticle(jats)
      const affiliationsNode = findChildrenByType(
        node,
        schema.nodes.affiliations
      )[0]?.node
      const affiliationNodes = findChildrenByType(
        node,
        schema.nodes.affiliation
      )
      expect(affiliationNodes).toHaveLength(0)
      expect(affiliationsNode).toBeUndefined()
    })
  })
  describe('author-notes', () => {
    it('should have author notes node with content if author notes element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const authorNotesEl = jats.querySelector('article-meta > author-notes')
      if (!authorNotesEl) {
        throw new Error('Author notes element not found')
      }
      const { node } = parseJATSArticle(jats)
      const authorNotesNode = findChildrenByType(
        node,
        schema.nodes.author_notes
      )[0]?.node
      expect(authorNotesNode).toBeDefined()
      expect(
        findChildrenByType(authorNotesNode, schema.nodes.footnote)
      ).toHaveLength(2)
      expect(
        findChildrenByType(authorNotesNode, schema.nodes.corresp)
      ).toHaveLength(1)
    })
    it('should not have author notes node if author notes element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const authorNotesEl = jats.querySelector('article-meta > author-notes')
      authorNotesEl?.remove()
      const { node } = parseJATSArticle(jats)
      const authorNotesNode = findChildrenByType(
        node,
        schema.nodes.authorNotes
      )[0]?.node
      expect(authorNotesNode).toBeUndefined()
    })
  })
  describe('awards', () => {
    it('should have awards node if awards element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const awardsEl = jats.querySelector('article-meta > funding-group')
      if (!awardsEl) {
        throw new Error('Awards element not found')
      }
      const { node } = parseJATSArticle(jats)
      const awardsNode = findChildrenByType(node, schema.nodes.awards)[0]?.node
      expect(awardsNode).toBeDefined()
      expect(
        findChildrenByType(awardsNode, schema.nodes.award).length
      ).toBeGreaterThan(0)
    })
    it('should correctly parse award nodes', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const awardsEl = jats.querySelector('article-meta > funding-group')
      if (!awardsEl) {
        throw new Error('Awards element not found')
      }
      const awards = awardsEl.querySelectorAll('award-group')
      const { node } = parseJATSArticle(jats)
      const awardsNode = findChildrenByType(node, schema.nodes.awards)[0]?.node
      const awardNodes = findChildrenByType(awardsNode, schema.nodes.award)
      expect(awardNodes.length).toBeGreaterThan(0)
      expect(awardNodes).toHaveLength(awards.length)
      awards.forEach((awardEl, priority) => {
        const awardNode = awardNodes[priority].node
        expect(awardNode.attrs.recipient).toBe(
          awardEl.querySelector('principal-award-recipient')?.textContent
        )
        expect(awardNode.attrs.code).toBe(
          Array.from(awardEl.querySelectorAll('award-id'))
            .map((awardID) => awardID.textContent)
            .reduce((acc, text) => (acc ? `${acc};${text}` : text), '')
        )
        expect(awardNode.attrs.source).toBe(
          awardEl.querySelector('funding-source')?.textContent
        )
      })
    })
    it('should not have awards node if awards element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const awardsEl = jats.querySelector('article-meta > funding-group')
      awardsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const awardsNode = findChildrenByType(node, schema.nodes.awards)[0]?.node
      expect(awardsNode).toBeUndefined()
    })
  })
  describe('keywords', () => {
    it('should have keywords node with content if keywords element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const keywordGroup = jats.querySelector('kwd-group')
      if (!keywordGroup) {
        throw new Error('Keyword group not found')
      }
      const keywordsElements = keywordGroup.querySelectorAll('kwd')
      const { node } = parseJATSArticle(jats)
      const keywords = findChildrenByType(node, schema.nodes.keywords)[0]?.node
      expect(keywords).toBeDefined()
      const keywordsNodes = findChildrenByType(keywords, schema.nodes.keyword)
      expect(keywordsNodes).toHaveLength(keywordsElements.length)
      const sectionTitle = findChildrenByType(
        keywords,
        schema.nodes.section_title
      )[0]?.node
      expect(sectionTitle).toBeDefined()
      expect(sectionTitle.textContent).toBe('Keywords')
      keywordsElements.forEach((keywordEl, priority) => {
        const keywordNode = keywordsNodes[priority].node
        expect(keywordNode.textContent).toBe(keywordEl.textContent)
      })
    })
    it('should not have keywords node if keywords element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const keywordGroup = jats.querySelector('kwd-group')
      keywordGroup?.remove()
      const { node } = parseJATSArticle(jats)
      const keywords = findChildrenByType(node, schema.nodes.keywords)[0]?.node
      expect(keywords).toBeUndefined()
    })
  })
  describe('supplements', () => {
    it('should have supplements node with content if supplementary-material elements exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const supplementryMaterial = jats.querySelectorAll(
        'article-meta > supplementary-material'
      )
      if (!supplementryMaterial.length) {
        throw new Error('Supplements not found')
      }
      const { node } = parseJATSArticle(jats)
      const supplementsNode = findChildrenByType(
        node,
        schema.nodes.supplements
      )[0]?.node
      expect(supplementsNode).toBeDefined()
      const sectionTitle = findChildrenByType(
        supplementsNode,
        schema.nodes.section_title
      )[0]?.node
      expect(sectionTitle).toBeDefined()
      expect(sectionTitle.textContent).toBe('Supplementary Material')

      supplementryMaterial.forEach((supplementEl, priority) => {
        const supplementNode = findChildrenByType(
          supplementsNode,
          schema.nodes.supplement
        )[priority].node
        expect(supplementNode.attrs.title).toBe(
          supplementEl.querySelector('title')?.textContent
        )
        expect(supplementNode.attrs.href).toBe(
          supplementEl.getAttributeNS(XLINK_NAMESPACE, 'href')
        )
        expect(supplementNode.attrs.mimeType).toBe(
          supplementEl.getAttribute('mimetype')
        )
        expect(supplementNode.attrs.mimeSubType).toBe(
          supplementEl.getAttribute('mime-subtype')
        )
      })
    })
    it('should not have supplements node if supplementary-material elements do not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const supplementryMaterial = jats.querySelectorAll(
        'article-meta > supplementary-material'
      )
      supplementryMaterial.forEach((supplement) => {
        supplement.remove()
      })
      const { node } = parseJATSArticle(jats)
      const supplementsNode = findChildrenByType(
        node,
        schema.nodes.supplements
      )[0]?.node
      expect(supplementsNode).toBeUndefined()
    })
  })
  describe('comments', () => {
    it('should mark comments correctly', async () => {
      const doc = await readAndParseFixture('jats-import.xml')
      markComments(doc)
      const commentsElement = doc.querySelector('comments')
      expect(commentsElement).not.toBeNull()

      const markers = doc.querySelectorAll('highlight-marker')
      //todo: markers count can be different to the comments count
      expect(markers.length).toBe(12)

      const commentElements = commentsElement?.querySelectorAll('comment')
      expect(commentElements?.length).toBe(12)
    })
    it('should create a comments node with comments if comments exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const commentsNode = findChildrenByType(node, schema.nodes.comments)[0]
        ?.node
      expect(commentsNode).toBeDefined()
      const comments = findChildrenByType(commentsNode, schema.nodes.comment)
      expect(comments).toHaveLength(12)
    })
    it('should parse comments correctly', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const commentsNode = findChildrenByType(node, schema.nodes.comments)[0]
        ?.node
      const comments = findChildrenByType(commentsNode, schema.nodes.comment)
      comments.forEach(({ node: commentNode }, priority) => {
        const commentEl = jats.querySelectorAll('comments > comment')[priority]
        expect(commentNode.attrs.contents).toBe(commentEl.textContent)
      })
    })
  })

  describe('abstracts', () => {
    it('should have abstract node with content if abstract element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractsEl = jats.querySelector('front > article-meta > abstract')
      if (!abstractsEl) {
        throw new Error('Abstract element not found')
      }
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findChildrenByType(node, schema.nodes.abstracts)[0]
        ?.node
      expect(abstractsNode).toBeDefined()
    })
    it("should have an abstracts even if abstarcts element doesn't exist", async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractsEl = jats.querySelector('front > article-meta > abstract')
      abstractsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findChildrenByType(node, schema.nodes.abstracts)[0]
        ?.node
      expect(abstractsNode).toBeDefined()
    })
  })

  test('parses JATS AuthorQueries example to Manuscripts document', async () => {
    const { node } = await createNodeFromJATS('jats-document.xml')
    changeIDs(node)
    expect(node).toMatchSnapshot()
  })
  test('parses full JATS example to Manuscripts document', async () => {
    const { node } = await createNodeFromJATS('jats-example-doc.xml')
    changeIDs(node)
    expect(node).toMatchSnapshot()
  })
  test("parses JATS article without references and doesn't create empty references section", async () => {
    const { node } = await createNodeFromJATS('jats-import-no-refs.xml')
    changeIDs(node)
    expect(node).toMatchSnapshot()
  })
  test('parses JATS article to Manuscripts document', async () => {
    const { node } = await createNodeFromJATS('jats-example.xml')
    changeIDs(node)
    expect(node).toMatchSnapshot()
  })
  test('parses JATS article with tables and table footnotes', async () => {
    const { node } = await createNodeFromJATS('jats-tables-example.xml')
    changeIDs(node)
    expect(node).toMatchSnapshot()
  })
})
