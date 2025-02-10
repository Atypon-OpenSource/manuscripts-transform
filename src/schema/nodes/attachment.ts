/*!
 * © 2025 Atypon Systems LLC
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
  href: string
  type: string
}

export interface AttachmentNode extends ManuscriptNode {
  attrs: Attrs
}
export const attachment: NodeSpec = {
  content: 'inline*',
  attrs: {
    id: { default: '' },
    type: { default: '' },
    href: { default: '' },
    dataTracked: { default: null },
  },
}
export const isAttachmentNode = (
  node: ManuscriptNode
): node is AttachmentNode => node.type === node.type.schema.nodes.attachment
