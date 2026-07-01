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

// The model barrel must come first: it constructs the `schema` instance that
// `node-names` (via the migrate -> id -> node-names chain) reads at load time.
export * from './schema'
export { migrateFor } from './schema/migration/migrate'
export { getVersion } from './getVersion'
export * from './schema/id'
export * from './schema/node-names'
export * from './schema/json-types'
export * from './schema/credit-roles'
export * from './schema/node-types'
export * from './schema/node-title'
export * from './schema/node-validator'
export * from './schema/section-categories'
export * from './schema/labels'
export * from './schema/queries'
