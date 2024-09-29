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

import { ManuscriptNode, ManuscriptNodeSpec } from '../types'

interface Attrs {
  id: string
}

export interface TableElementFooterNode extends ManuscriptNode {
  attrs: Attrs
}

interface TableElementNodeSpec extends ManuscriptNodeSpec {
  isWrapper: boolean
}

export const tableElementFooter: TableElementNodeSpec = {
  name: 'Table Footer',
  isWrapper: true,
  attrs: {
    id: { default: '' },
    dataTracked: { default: null },
  },
  content: 'general_table_footnote? footnotes_element?',
  group: 'block element',
  toDOM: () => ['table-wrap-foot', 0],
}
