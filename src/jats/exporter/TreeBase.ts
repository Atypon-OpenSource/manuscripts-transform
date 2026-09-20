/*!
 * © 2026 Atypon Systems LLC
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

import * as Citeproc from 'citeproc'
import { DOMOutputSpec, DOMSerializer, type NodeType } from 'prosemirror-model'
import { findChildrenByAttr, findChildrenByType } from 'prosemirror-utils'
import serializeToXML from 'w3c-xmlserializer'

import { buildCiteprocCitation } from '../../lib/citeproc'
import { CreditRoleUrls } from '../../lib/credit-roles'
import { generateFootnoteLabels } from '../../lib/footnotes'
import { FOOTNOTE_SECTION_CATEGORY_IDS } from '../../lib/section-categories'
import {
  sanitizeXmlString,
  XLINK_NAMESPACE,
  XML_NAMESPACE,
} from '../../lib/xml'
import {
  ActualManuscriptNode,
  AffiliationNode,
  AuthorNotesNode,
  AwardNode,
  ExtLink,
  CitationNode,
  ContributorNode,
  CorrespNode,
  CrossReferenceNode,
  FootnoteNode,
  isBibliographyItemNode,
  isCitationNode,
  isNodeOfType,
  ManuscriptMark,
  ManuscriptNode,
  ManuscriptNodeType,
  Marks,
  Nodes,
  ParagraphNode,
  QuoteImageNode,
  schema,
  BioNode,
} from '../../schema'
import { isExecutableNodeType } from '../../transformer'
import { IDGenerator } from '../types'
import { initJats, jatsVariableWrapper } from './citeproc'
import { selectVersionIDs, Version } from './jats-versions'
import { buildTargets, Target } from './labels'
import { normalizeID } from './lib'

export class TreeBase {
  private nodesMap: Map<NodeType, ManuscriptNode[]> = new Map()
  protected manuscriptNode: ManuscriptNode
  protected document: Document
  protected serializer: DOMSerializer

  public isChildOfNodeType(targetID: string, type: NodeType, descend = false) {
    const nodes = this.getChildrenOfType(type)
    return nodes.some((node) => {
      const result = findChildrenByAttr(
        node,
        (attrs) => attrs.id === targetID,
        descend
      )[0]
      return !!result
    })
  }

  protected populateNodesMap = () => {
    this.manuscriptNode.descendants((node) => {
      const type = node.type
      const nodes = this.nodesMap.get(type) ?? []
      nodes.push(node)
      this.nodesMap.set(type, nodes)
    })
  }

  public getChildrenOfType<T extends ManuscriptNode>(
    type: NodeType,
    node?: ManuscriptNode
  ): T[] {
    const nodes = node
      ? findChildrenByType(node, type).map(({ node }) => node)
      : this.nodesMap.get(type)
    return (nodes ?? []).filter((n): n is T => isNodeOfType<T>(n, type))
  }

  public getFirstChildOfType<T extends ManuscriptNode>(
    type: NodeType,
    node?: ManuscriptNode
  ): T | undefined {
    return this.getChildrenOfType<T>(type, node)[0]
  }

  protected fillEmptyElements(
    $article: Element,
    selector: string,
    tagName = 'p'
  ) {
    const $empty = Array.from($article.querySelectorAll(selector)).filter(
      ($el) => !$el.innerHTML
    )
    $empty.forEach(($element) =>
      $element.appendChild(this.createElement(tagName))
    )
  }

  protected createElement = (
    tag: string,
    content?: string,
    attrs?: Record<string, string | undefined>
  ) => {
    const $element = this.document.createElement(tag)
    if (content) {
      $element.textContent = content
    }
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v) {
          $element.setAttribute(k, v)
        }
      })
    }
    return $element
  }

  protected appendElement = (
    $parent: Element,
    tag: string,
    content?: string,
    attrs?: Record<string, string | undefined>
  ) => {
    const $element = this.createElement(tag, content, attrs)
    $parent.appendChild($element)
    return $element
  }

  protected changeTag = ($node: Element, tag: string) => {
    const $clone = this.createElement(tag)
    for (const attr of $node.attributes) {
      $clone.setAttributeNS(null, attr.name, attr.value)
    }
    while ($node.firstChild) {
      $clone.appendChild($node.firstChild)
    }
    $node.replaceWith($clone)
    return $clone
  }

  protected createElementWithID(node: ManuscriptNode, nodeName: string) {
    const $element = this.createElement(nodeName)
    $element.setAttribute('id', normalizeID(node.attrs.id))
    return $element
  }

  protected serializeNode(node: ManuscriptNode) {
    return this.serializer.serializeNode(node, {
      document: this.document,
    })
  }

  appendChildIfPresent($parent: Element, tagName: string, textContent: string) {
    if (!textContent) {
      return
    }
    const $element = this.createElement(tagName)
    $element.textContent = textContent
    $parent.appendChild($element)
  }

  processChildNodes = (
    $element: Element,
    node: ManuscriptNode,
    contentNodeType: ManuscriptNodeType
  ) => {
    node.forEach((childNode) => {
      if (childNode.type === contentNodeType) {
        if (childNode.attrs.id) {
          $element.appendChild(this.serializeNode(childNode))
        }
      } else if (childNode.type === node.type.schema.nodes.paragraph) {
        $element.appendChild(this.serializeNode(childNode))
      } else if (childNode.type === node.type.schema.nodes.missing_figure) {
        $element.appendChild(this.serializeNode(childNode))
      }
    })
  }
}
