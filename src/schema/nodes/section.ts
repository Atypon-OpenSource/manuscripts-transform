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

import { NodeSpec } from 'prosemirror-model'

import { ManuscriptNode } from '../types'
import { CommentNode } from './comment'

interface Attrs {
  id: string
  category?: string
  titleSuppressed: boolean
  generatedLabel: boolean
  pageBreakStyle?: number
  comments?: CommentNode[]
}

export interface SectionNode extends ManuscriptNode {
  attrs: Attrs
}

export const PAGE_BREAK_NONE = 0
export const PAGE_BREAK_BEFORE = 1
export const PAGE_BREAK_AFTER = 2
export const PAGE_BREAK_BEFORE_AND_AFTER = 4

const choosePageBreakStyle = (element: HTMLElement): number => {
  const pageBreakAfter = element.classList.contains('page-break-after')
  const pageBreakBefore = element.classList.contains('page-break-before')

  if (pageBreakBefore && pageBreakAfter) {
    return PAGE_BREAK_BEFORE_AND_AFTER
  }

  if (pageBreakBefore) {
    return PAGE_BREAK_BEFORE
  }

  if (pageBreakAfter) {
    return PAGE_BREAK_AFTER
  }

  return PAGE_BREAK_NONE
}

export const section: NodeSpec = {
  // NOTE: the schema needs paragraphs to be the default type, so they must explicitly come first
  content: 'section_label? section_title (paragraph | element)* sections*',
  attrs: {
    id: { default: '' },
    category: { default: '' },
    titleSuppressed: { default: false },
    generatedLabel: { default: undefined },
    pageBreakStyle: { default: undefined },
    dataTracked: { default: null },
    comments: { default: null },
  },
  group: 'block sections',
  selectable: false,
  parseDOM: [
    {
      tag: 'section',
      getAttrs: (dom) => {
        const element = dom as HTMLElement

        return {
          id: element.getAttribute('id') || '',
          category: element.getAttribute('data-category') || '',
          titleSuppressed: element.classList.contains('title-suppressed'),
          generatedLabel: element.classList.contains('generated-label'),
          pageBreakStyle: choosePageBreakStyle(element) || undefined,
        }
      },
    },
  ],
}

export const isSectionNode = (node: ManuscriptNode): node is SectionNode =>
  node.type === node.type.schema.nodes.section
