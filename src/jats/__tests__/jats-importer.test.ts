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

import { ContributorCorresp, ContributorFootnote, schema } from '../../schema'
import { chooseSectionCategoryByType } from '../../transformer'
import { parseJATSArticle } from '../importer/parse-jats-article'
import { readAndParseFixture } from './files'
import {
  changeIDs,
  createNodeFromJATS,
  findNodeByType,
  findNodesByType,
  updateNodeID,
} from './utils'

describe('JATS importer', () => {
  describe('title node', () => {
    it('should have title node with content if title element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const titleNode = findNodeByType(node, schema.nodes.title)
      expect(titleNode).toBeDefined()
      updateNodeID(titleNode)
      expect(titleNode).toMatchSnapshot()
    })
    it('should have title node with default content if title element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const titleEl = jats.querySelector(
        'article-meta > title-group > article-title'
      )
      titleEl?.remove()
      const { node } = parseJATSArticle(jats)
      const titleNode = findNodeByType(node, schema.nodes.title)
      updateNodeID(titleNode)
      expect(titleNode).toMatchSnapshot()
    })
  })
  describe('contributors node', () => {
    it('should have contributors node with content if contributors element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const contributorsNode = findNodeByType(node, schema.nodes.contributors)
      expect(node).toBeDefined()
      expect(contributorsNode).toBeDefined()
      expect(
        findNodesByType(contributorsNode, schema.nodes.contributor)
      ).toHaveLength(2)
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
      const contributorNodes = findNodesByType(node, schema.nodes.contributor)
      expect(contributorNodes).toHaveLength(contributors.length)
      contributorNodes.forEach((node) => {
        updateNodeID(node)
        //@ts-ignore
        node.attrs.affiliations = node.attrs.affiliations.map(
          (_aff: string) => 'MPAffiliation:test'
        )
        //@ts-ignore
        node.attrs.footnote = node.attrs.footnote.map(
          (footnote: ContributorFootnote) => {
            return { ...footnote, noteID: 'MPFootnote:test' }
          }
        )
        //@ts-ignore
        node.attrs.corresp = node.attrs.corresp.map(
          (corresp: ContributorCorresp) => {
            return { ...corresp, correspID: 'MPCorrespondance:test' }
          }
        )
      })

      expect(contributorNodes).toMatchSnapshot()
    })
    it('should not have contributors node if contributors element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const contributorsEl = jats.querySelector('article-meta > contrib-group')
      contributorsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const contributorsNode = findNodesByType(node, schema.nodes.contributors)
      const contributorNodes = findNodesByType(node, schema.nodes.contributor)
      expect(contributorNodes).toHaveLength(0)
      expect(contributorsNode).toHaveLength(0)
    })
  })
  describe('affiliations', () => {
    it('should correctly parse affiliation nodes', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const affiliationNodes = findNodesByType(node, schema.nodes.affiliation)
      affiliationNodes.forEach(updateNodeID)
      expect(affiliationNodes).toMatchSnapshot()
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
      const affiliationsNode = findNodeByType(node, schema.nodes.affiliations)
      const affiliationNodes = findNodesByType(node, schema.nodes.affiliation)
      expect(affiliationNodes).toHaveLength(0)
      expect(affiliationsNode).toBeUndefined()
    })
  })
  describe('author-notes', () => {
    it('should have author notes node with content if author notes element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const authorNotesNode = findNodeByType(node, schema.nodes.author_notes)
      expect(authorNotesNode).toBeDefined()
      expect(
        findNodesByType(authorNotesNode, schema.nodes.footnote)
      ).toHaveLength(2)
      expect(
        findNodesByType(authorNotesNode, schema.nodes.corresp)
      ).toHaveLength(1)
      updateNodeID(authorNotesNode)
      authorNotesNode.descendants(updateNodeID)
      expect(authorNotesNode).toMatchSnapshot()
    })
    it('should not have author notes node if author notes element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const authorNotesEl = jats.querySelector('article-meta > author-notes')
      authorNotesEl?.remove()
      const { node } = parseJATSArticle(jats)
      const authorNotesNode = findNodeByType(node, schema.nodes.authorNotes)
      expect(authorNotesNode).toBeUndefined()
    })
  })
  describe('awards', () => {
    it('should have awards node if awards element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const awardsNode = findNodeByType(node, schema.nodes.awards)
      expect(awardsNode).toBeDefined()
      expect(
        findNodesByType(awardsNode, schema.nodes.award).length
      ).toBeGreaterThan(0)
    })
    it('should correctly parse award nodes', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const awardsNode = findNodeByType(node, schema.nodes.awards)
      expect(awardsNode).toMatchSnapshot()
    })
    it('should not have awards node if awards element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const awardsEl = jats.querySelector('article-meta > funding-group')
      awardsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const awardsNode = findNodeByType(node, schema.nodes.awards)
      expect(awardsNode).toBeUndefined()
    })
  })
  describe('keywords', () => {
    it('should have keywords node with content if keywords element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const keywords = findNodeByType(node, schema.nodes.keywords)
      expect(keywords).toBeDefined()
      const keywordsNodes = findNodesByType(keywords, schema.nodes.keyword)
      const sectionTitle = findNodeByType(keywords, schema.nodes.section_title)
      expect(sectionTitle).toBeDefined()
      expect(sectionTitle.textContent).toBe('Keywords')
      keywordsNodes.forEach(updateNodeID)
      expect(keywordsNodes).toMatchSnapshot()
    })
    it('should not have keywords node if keywords element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const keywordGroup = jats.querySelector('kwd-group')
      keywordGroup?.remove()
      const { node } = parseJATSArticle(jats)
      const keywords = findNodeByType(node, schema.nodes.keywords)
      expect(keywords).toBeUndefined()
    })
  })
  describe('supplements', () => {
    it('should have supplements node with content if supplementary-material elements exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const supplementsNode = findNodeByType(node, schema.nodes.supplement)
      updateNodeID(supplementsNode)
      expect(supplementsNode).toMatchSnapshot()
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
      const supplementsNode = findNodeByType(node, schema.nodes.supplements)
      expect(supplementsNode).toBeUndefined()
    })
  })
  describe('comments', () => {
    it('should parse keyword comment', async () => {
      const jats = await readAndParseFixture('jats-comments.xml')
      const { node } = parseJATSArticle(jats)
      const group = findNodeByType(node, schema.nodes.keyword_group)
      const markers = findNodesByType(group, schema.nodes.highlight_marker)
      expect(markers.length).toBe(0)

      const groupID = group.attrs.id
      const comments = findNodesByType(node, schema.nodes.comment)
      const comment = comments.filter((c) => c.attrs.target === groupID)[0]
      expect(comment.attrs.contents).toBe('Keyword comment')
    })
    it('should parse abstract comment', async () => {
      const jats = await readAndParseFixture('jats-comments.xml')
      const { node } = parseJATSArticle(jats)
      const abstracts = findNodeByType(node, schema.nodes.abstracts)
      const paragraph = findNodeByType(abstracts, schema.nodes.paragraph)
      const marker = findNodeByType(paragraph, schema.nodes.highlight_marker)
      const commentID = marker.attrs.id

      // @ts-ignore
      marker.attrs.id = 'MPCommentAnnotation:test'
      expect(paragraph.content).toMatchSnapshot()

      const comments = findNodesByType(node, schema.nodes.comment)
      const comment = comments.filter((c) => c.attrs.id === commentID)[0]
      expect(comment.attrs.contents).toBe('Abstract comment')
    })
    it('should parse body comment', async () => {
      const jats = await readAndParseFixture('jats-comments.xml')
      const { node } = parseJATSArticle(jats)
      const body = findNodeByType(node, schema.nodes.body)
      const paragraph = findNodeByType(body, schema.nodes.paragraph)
      const marker = findNodeByType(paragraph, schema.nodes.highlight_marker)
      const commentID = marker.attrs.id

      // @ts-ignore
      marker.attrs.id = 'MPCommentAnnotation:test'
      expect(paragraph.content).toMatchSnapshot()

      const comments = findNodesByType(node, schema.nodes.comment)
      const comment = comments.filter((c) => c.attrs.id === commentID)[0]
      expect(comment.attrs.contents).toBe('Body comment')
    })
    it('should parse back comment', async () => {
      const jats = await readAndParseFixture('jats-comments.xml')
      const { node } = parseJATSArticle(jats)
      const back = findNodeByType(node, schema.nodes.backmatter)
      const paragraph = findNodeByType(back, schema.nodes.paragraph)
      const marker = findNodeByType(paragraph, schema.nodes.highlight_marker)
      const commentID = marker.attrs.id

      // @ts-ignore
      marker.attrs.id = 'MPCommentAnnotation:test'
      expect(paragraph.content).toMatchSnapshot()

      const comments = findNodesByType(node, schema.nodes.comment)
      const comment = comments.filter((c) => c.attrs.id === commentID)[0]
      expect(comment.attrs.contents).toBe('Back comment')
    })
    it('should parse ref-list comment', async () => {
      const jats = await readAndParseFixture('jats-comments.xml')
      const { node } = parseJATSArticle(jats)
      const element = findNodeByType(node, schema.nodes.bibliography_element)
      const markers = findNodesByType(element, schema.nodes.highlight_marker)
      expect(markers.length).toBe(0)

      const item = element.child(0)
      const itemID = item.attrs.id
      const comments = findNodesByType(node, schema.nodes.comment)
      const comment = comments.filter((c) => c.attrs.target === itemID)[0]
      expect(comment.attrs.contents).toBe('Ref comment')
    })
  })

  describe('abstracts', () => {
    it('should have abstract node if abstract element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractsEl = jats.querySelector('front > article-meta > abstract')
      if (!abstractsEl) {
        throw new Error('Abstract element not found')
      }
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findNodeByType(node, schema.nodes.abstracts)
      expect(abstractsNode).toBeDefined()
    })
    it("should have an abstracts even if abstarcts element doesn't exist", async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractsEl = jats.querySelector('front > article-meta > abstract')
      abstractsEl?.remove()
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findNodeByType(node, schema.nodes.abstracts)
      expect(abstractsNode).toBeDefined()
    })
    it('should have the correct number of sections', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractEl = jats.querySelector('front > article-meta > abstract')
      if (!abstractEl) {
        throw new Error('Abstract element not found')
      }
      const sectionElements = abstractEl.querySelectorAll('sec')
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findNodeByType(node, schema.nodes.abstracts)
      const sections = findNodesByType(abstractsNode, schema.nodes.section)
      // first section is the abstract node
      expect(sections).toHaveLength(sectionElements.length + 1)
    })
    it('should set the title to Abstract if no title is provided', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const abstractEl = jats.querySelector('front > article-meta > abstract')
      if (!abstractEl) {
        throw new Error('Abstract element not found')
      }
      const { node } = parseJATSArticle(jats)
      const abstractsNode = findNodeByType(node, schema.nodes.abstracts)
      const sections = findNodesByType(abstractsNode, schema.nodes.section)
      const firstSection = sections[0]
      const titleNode = findNodeByType(firstSection, schema.nodes.section_title)
      expect(titleNode.textContent).toBe('Abstract')
    })
  })

  describe('body', () => {
    it('should have body node if body element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const bodyEl = jats.querySelector('body')
      if (!bodyEl) {
        throw new Error('Body element not found')
      }
      const { node } = parseJATSArticle(jats)
      const bodyNode = findNodeByType(node, schema.nodes.body)
      expect(bodyNode).toBeDefined()
    })
    it('should have the correct number of sections', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const { node } = parseJATSArticle(jats)
      const bodyNode = findNodeByType(node, schema.nodes.body)
      const sections = findNodesByType(bodyNode, schema.nodes.section, false)
      expect(sections).toHaveLength(5)
    })
    it('should have a body node even if body element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const bodyEl = jats.querySelector('body')
      bodyEl?.remove()
      const { node } = parseJATSArticle(jats)
      const bodyNode = findNodeByType(node, schema.nodes.body)
      expect(bodyNode).toBeDefined()
    })
  })
  describe('backmatter', () => {
    it('should have backmatter node if back element exists', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const backEl = jats.querySelector('back')
      if (!backEl) {
        throw new Error('Back element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      expect(backNode).toBeDefined()
    })
    it('should have appendices section if app-group element exists', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const appGroup = jats.querySelector('back > app-group')
      if (!appGroup) {
        throw new Error('App group element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const appNode = findNodesByType(
        backNode,
        schema.nodes.section,
        false
      ).filter((node) => node.attrs.category === 'MPSectionCategory:appendices')
      expect(appNode).toHaveLength(1)
    })
    it('should correctly add back sections to the backmatter', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const backEl = jats.querySelector('back')
      if (!backEl) {
        throw new Error('Back element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const availabilitySection = findNodesByType(
        backNode,
        schema.nodes.section,
        false
      ).filter(
        (node) => node.attrs.category === 'MPSectionCategory:availability'
      )
      expect(availabilitySection).toHaveLength(1)
    })
    it('should create sections for special footnotes', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const specialFootnotes = [...jats.querySelectorAll('fn[fn-type')].filter(
        (fn) => chooseSectionCategoryByType(fn.getAttribute('fn-type') ?? '')
      )
      expect(specialFootnotes.length).toBe(3)

      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)

      const con = findNodesByType(backNode, schema.nodes.section, false).filter(
        (node) => node.attrs.category === 'MPSectionCategory:con'
      )
      const financialDisclosure = findNodesByType(
        backNode,
        schema.nodes.section,
        false
      ).filter(
        (node) =>
          node.attrs.category === 'MPSectionCategory:financial-disclosure'
      )
      const conflict = findNodesByType(
        backNode,
        schema.nodes.section,
        false
      ).filter(
        (node) =>
          node.attrs.category === 'MPSectionCategory:competing-interests'
      )
      expect(con).toHaveLength(1)
      expect(financialDisclosure).toHaveLength(1)
      expect(conflict).toHaveLength(1)
    })
    it('should have an endnotes section if either an endnotes section exists or there are footnotes', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const endNotesSection = findNodesByType(
        backNode,
        schema.nodes.footnotes_section,
        false
      )
      expect(endNotesSection).toHaveLength(1)
    })
    it('should have a references section if ref-list element exists', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const refList = jats.querySelector('ref-list')
      if (!refList) {
        throw new Error('Ref list element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const refSection = findNodesByType(
        backNode,
        schema.nodes.bibliography_section,
        false
      )
      expect(refSection).toHaveLength(1)
    })
    it('should have an acknowledgements section if ack element exists', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const ack = jats.querySelector('ack')
      if (!ack) {
        throw new Error('Ack element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const ackSection = findNodesByType(
        backNode,
        schema.nodes.section,
        false
      ).filter(
        (node) => node.attrs.category === 'MPSectionCategory:acknowledgement'
      )

      expect(ackSection).toHaveLength(1)
    })
    it('should parse references correctly', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const refList = jats.querySelector('back > ref-list')
      if (!refList) {
        throw new Error('Ref list element not found')
      }
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      const refSection = findNodeByType(
        backNode,
        schema.nodes.bibliography_section
      )
      const bibliographyItems = findNodesByType(
        refSection,
        schema.nodes.bibliography_item
      )
      expect(bibliographyItems).toHaveLength(1)
      expect(bibliographyItems[0].attrs.id).toBeDefined()
      expect(bibliographyItems[0].attrs.author).toHaveLength(1)
      updateNodeID(bibliographyItems[0])
      bibliographyItems[0].attrs.author[0]._id = 'MPBibliographicName:test'
      bibliographyItems[0].attrs.issued._id = 'MPBibliographicDate:test'
      expect(bibliographyItems[0]).toMatchSnapshot()
    })
    it('should have the correct number of sections', async () => {
      const jats = await readAndParseFixture('jats-example-full.xml')
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      expect(backNode.childCount).toBe(8)
    })
    it('should have a backmatter node even if back element does not exist', async () => {
      const jats = await readAndParseFixture('jats-import.xml')
      const backEl = jats.querySelector('back')
      backEl?.remove()
      const { node } = parseJATSArticle(jats)
      const backNode = findNodeByType(node, schema.nodes.backmatter)
      expect(backNode).toBeDefined()
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
