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

import { CommentAnnotation, Model } from '@manuscripts/json-schema'

import { Build, buildComment } from './builders'
import { isKeyword } from './object-types'

export type HighlightableField = 'title' | 'caption' | 'contents'

const highlightableFields: HighlightableField[] = [
  'caption',
  'contents',
  'title',
]

export const isHighlightableModel = (
  model: Model
): model is HighlightableModel => {
  if (isKeyword(model)) {
    return true
  }
  for (const field of highlightableFields) {
    if (field in model) {
      return true
    }
  }

  return false
}

export interface HighlightableModel extends Model {
  contents?: string
  title?: string
  caption?: string
}

export const extractHighlightMarkers = (
  model: HighlightableModel,
  commentAnnotationsMap: Map<string, Build<CommentAnnotation>>
) => {
  for (const field of highlightableFields) {
    let html = model[field]

    if (html === undefined) {
      continue
    }

    const template = document.createElement('template')
    template.innerHTML = `<div>${html}</div>` // ensure a wrapper

    const element = template.content.firstChild

    if (!(element instanceof Element)) {
      continue
    }

    const markers = element.querySelectorAll('span.highlight-marker')

    if (markers.length) {
      // splice the markers out in order
      for (const marker of markers) {
        const markerHTML = marker.outerHTML

        const offset: number = html.indexOf(markerHTML) // TODO: ensure this is reliable

        if (offset === -1) {
          continue
        }

        const _id = marker.getAttribute('id')
        const target = marker.getAttribute('data-target-id')

        if (_id && target) {
          const position = marker.getAttribute('data-position')

          const commentAnnotation = { ...buildComment(target, ''), _id: _id }

          if (position === 'start') {
            commentAnnotationsMap.set(commentAnnotation._id, {
              ...commentAnnotation,
              selector: {
                from: offset,
                to: -1,
              },
            })
          } else if (position === 'end') {
            const comment = commentAnnotationsMap.get(commentAnnotation._id)
            if (comment && comment.selector) {
              commentAnnotationsMap.set(comment._id, {
                ...comment,
                selector: { ...comment.selector, to: offset },
              })
            }
          } else if (position === 'point') {
            commentAnnotationsMap.set(commentAnnotation._id, {
              ...commentAnnotation,
              selector: { from: offset, to: offset },
            })
          }
        }

        // splice out the marker
        html = html.substr(0, offset) + html.substr(offset + markerHTML.length)
      }

      model[field] = html
    }
  }
}

export const insertHighlightMarkers = (
  contents: string,
  commentAnnotations: CommentAnnotation[]
): string => {
  let output = contents

  const sortedComments = commentAnnotations.sort((a, b) => {
    if (a.selector && b.selector) {
      return b.selector.from - a.selector.from
    } else {
      return 0
    }
  })
  for (const comment of sortedComments) {
    let element: HTMLSpanElement
    if (comment.selector) {
      if (comment.selector.from === comment.selector.to) {
        element = createHighlightElement(comment, 'point')
        output = injectHighlightMarker(element, comment.selector.from, output)
      } else {
        element = createHighlightElement(comment, 'start')
        output = injectHighlightMarker(element, comment.selector.from, output)

        const updatedEndOffset = element.outerHTML.length + comment.selector.to
        element = createHighlightElement(comment, 'end')
        output = injectHighlightMarker(element, updatedEndOffset, output)
      }
    }
  }
  return output
}

function injectHighlightMarker(
  element: HTMLElement,
  offset: number,
  contents: string
) {
  const parts = [
    contents.substring(0, offset),
    element.outerHTML,
    contents.substring(offset),
  ]

  return parts.join('')
}

const createHighlightElement = (
  comment: CommentAnnotation,
  position: string
) => {
  const element = document.createElement('span')
  element.className = 'highlight-marker'
  element.setAttribute('id', comment._id)
  element.setAttribute('data-target-id', comment.target)
  element.setAttribute('data-position', position)
  return element
}
