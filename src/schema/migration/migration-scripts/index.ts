/*!
 * © 2024 Atypon Systems LLC
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

import Migration125 from './1.2.5'
import Migration2322 from './2.3.22'
import { Migration3012 } from './3.0.12'
import Migration3021 from './3.0.21'
import Migration3022 from './3.0.22'
import Migration3030 from './3.0.30'

const migrations = [
  new Migration125(),
  new Migration2322(),
  new Migration3012(),
  new Migration3021(),
  new Migration3022(),
  new Migration3030(),
]

export default migrations
