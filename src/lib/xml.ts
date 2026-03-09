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

export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
export const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'

export function sanitizeXmlString(str: string): string {
  return (
    str
      // Escape bare ampersands (not part of valid entities)
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;')
      // Escape < that doesn't start a valid tag
      .replace(/<(?![a-zA-Z_\/!?])/g, '&lt;')
  )
}
