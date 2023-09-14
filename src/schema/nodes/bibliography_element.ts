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

interface Attrs {
  id: string
  paragraphStyle: string
}

export interface BibliographyElementNode extends ManuscriptNode {
  attrs: Attrs
}

export const bibliographyElement: NodeSpec = {
  content: '(placeholder | bibliography_item)+',
  attrs: {
    id: { default: '' },
    contents: { default: '' },
    paragraphStyle: { default: '' },
    dataTracked: { default: null },
  },
  selectable: false,
  group: 'block element',
  parseDOM: [
    {
      tag: 'div.csl-bib-body',
      getAttrs: () => {
        return {
          contents: '',
        }
      },
    },
  ],
  toDOM: () => {
    const dom = document.createElement('div')
    dom.className = 'csl-bib-body'
    return dom
  },
}
