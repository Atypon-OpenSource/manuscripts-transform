/*!
 * © 2020 Atypon Systems LLC
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

import { Model, ObjectTypes } from '@manuscripts/json-schema'
import JSZip from 'jszip'

import { generateID } from './id'

// TODO: handle `prototype`? remove if not present?
export const updateIdentifiers = async (
  data: Model[]
): Promise<{ data: Model[]; idMap: Map<string, string> }> => {
  const idMap = new Map<string, string>()

  const updateIDs = (model: Model) => {
    const { _id, objectType } = model

    // TODO: ignore items when _bundled is true?
    // TODO: set prototype for bundled objects? add new bundled objects at the end?
    if (!objectType || !_id || !_id.match(/^MP.+:.+/)) {
      return
    }

    if (idMap.has(_id)) {
      model._id = idMap.get(_id) as string
    } else {
      model._id = generateID(objectType as ObjectTypes)

      idMap.set(_id, model._id)
    }

    // TODO: avoid infinite loops
    for (const value of Object.values(model)) {
      if (Array.isArray(value)) {
        value.forEach(updateIDs)
      } else {
        updateIDs(value)
      }
    }
  }

  const replaceContent = (content: string) => {
    // replace ids with colon separator
    content = content.replace(/MP\w+:[\w-]+/g, (match) => {
      const value = idMap.get(match)

      return value ?? match
    })

    // replace ids with underscore separator
    content = content.replace(/MP\w+_[\w-]+/g, (match) => {
      const value = idMap.get(match.replace('_', ':'))

      return value ? value.replace(':', '_') : match
    })

    return content
  }

  const updateContent = (model: Model) => {
    for (const [key, value] of Object.entries(model)) {
      if (typeof value === 'object') {
        updateContent(value)
      } else if (typeof value === 'string') {
        // @ts-ignore
        model[key] = replaceContent(value)
      }
    }
  }

  for (const item of data) {
    updateIDs(item)
  }

  for (const item of data) {
    updateContent(item)
  }

  // TODO: delete _rev, bundled, locked, sessionID?

  return { data, idMap }
}

export const updateAttachmentPath = (
  oldPath: string,
  idMap: Map<string, string>
): string | undefined => {
  const matches = oldPath.match(/^Data\/([^.]+)(.*)/)

  if (matches) {
    const [, prefix, suffix] = matches

    const id = idMap.get(prefix.replace('_', ':'))

    if (id) {
      const newPrefix = id.replace(':', '_')

      return `Data/${newPrefix}${suffix}`
    }
  }
}

export const updateAttachments = async (
  zip: JSZip,
  idMap: Map<string, string>
) => {
  for (const [oldPath, entry] of Object.entries(zip.files)) {
    const newPath = updateAttachmentPath(oldPath, idMap)

    if (newPath) {
      zip.file(newPath, await entry.async('blob')).remove(oldPath)
    }
  }
}
