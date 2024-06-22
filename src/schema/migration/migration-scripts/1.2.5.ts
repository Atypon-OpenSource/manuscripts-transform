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

import { Transaction } from 'prosemirror-state'
import { MigrationScript } from '../migration-script'
import { Node as ProsemirrorNode } from 'prosemirror-model'

class Migration126 implements MigrationScript {
  fromVersion: '1.2.4'
  toVersion: '1.2.5'
  descendants(pos: string, node: ProsemirrorNode) {}
}

export default Migration126
