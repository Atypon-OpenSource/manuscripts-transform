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

import {
  GROUP_ELEMENT,
  GROUP_EXECUTABLE,
  GROUP_SECTION,
  hasGroup,
  ManuscriptNode,
  ManuscriptNodeType,
  Nodes,
} from '../schema'

export const isExecutableNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_EXECUTABLE)

export const isElementNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_ELEMENT)

export const isSectionNodeType = (type: ManuscriptNodeType) =>
  hasGroup(type, GROUP_SECTION)

export const isNodeType = <T extends ManuscriptNode>(
  node: ManuscriptNode,
  type: Nodes
): node is T => node.type === node.type.schema.nodes[type]
