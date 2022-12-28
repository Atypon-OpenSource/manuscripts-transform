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

import { Model, UserProfile } from '@manuscripts/manuscripts-json-schema'

export interface Attachment {
  id: string
  data: Blob | ArrayBuffer
  type: string
}

export interface ModelAttachment {
  attachment?: Attachment
}

export type ModelWithAttachment = Model & ModelAttachment

export interface UserProfileWithAvatar extends UserProfile {
  avatar?: string
}

export interface ContainedProps {
  containerID: string
}

export type ContainedModel = Model & ContainedProps

export interface ManuscriptProps {
  manuscriptID: string
}

export type ManuscriptModel = ContainedModel & ManuscriptProps

export interface CommentSelector {
  from: number
  to: number
}

export interface PlaceholderElement extends ContainedModel {
  elementType: 'p'
}
