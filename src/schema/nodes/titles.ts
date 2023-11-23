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
  title: string
  subtitle: string
  runningTitle: string
}

export interface TitlesNode extends ManuscriptNode {
  attrs: Attrs
}

export const titles: NodeSpec = {
  content: '(text | highlight_marker)*',
  marks: 'italic smallcaps subscript superscript tracked_insert tracked_delete',

  attrs: {
    id: { default: '' },
    title: { default: '' },
    subtitle: { default: '' },
    runningTitle: { default: '' },
    dataTracked: { default: null },
  },
  group: 'block element',
  parseDOM: [{ tag: 'div.article-titles' }],
  toDOM: () => ['div', { class: 'article-titles' }, 0],
}
