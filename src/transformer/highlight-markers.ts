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

export type HighlightableField = 'title' | 'caption' | 'contents'

export const highlightableFields: HighlightableField[] = [
  'caption',
  'contents',
  'title',
]

export const isHighlightableModel = (
  model: Model
): model is HighlightableModel => {
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

export type CommentMarker = {
  _id: string
  from: number
  to: number
}

export const extractCommentMarkers = (model: Model) => {
  if (!isHighlightableModel(model)) {
    return []
  }
  const comments = new Map<string, CommentMarker>()
  for (const field of highlightableFields) {
    let html = model[field] as string

    if (!html || !html.includes('highlight-marker')) {
      continue
    }

    const template = document.createElement('template')
    template.innerHTML = `<div>${html}</div>` // ensure a wrapper

    const element = template.content.firstChild as Element

    if (!element) {
      continue
    }

    const markers = element.querySelectorAll('span.highlight-marker')

    if (!markers.length) {
      continue
    }

    // splice the markers out in order
    for (const marker of markers) {
      const markerHTML = marker.outerHTML

      const offset = html.indexOf(markerHTML) // TODO: ensure this is reliable

      if (offset === -1) {
        continue
      }

      const id = marker.getAttribute('id')
      const target = marker.getAttribute('data-target-id')

      if (id && target) {
        const position = marker.getAttribute('data-position')
        if (position === 'start') {
          const comment = {
            _id: id,
            from: offset,
            to: -1,
          }
          comments.set(id, comment)
        } else if (position === 'end') {
          const comment = comments.get(id)
          if (comment) {
            comment.to = offset
          }
        } else if (position === 'point') {
          const comment = {
            _id: id,
            from: offset,
            to: offset,
          }
          comments.set(id, comment)
        }
      }

      // splice out the marker
      html =
        html.substring(0, offset) + html.substring(offset + markerHTML.length)
    }

    model[field] = html
  }
  return Array.from(comments.values())
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
        output = injectHighlightMarker(element, comment.selector, output)
      } else {
        element = createHighlightElement(
          comment,
          'range',
          output.substring(comment.selector.from, comment.selector.to)
        )
        output = injectHighlightMarker(element, comment.selector, output)
      }
    }
  }
  return output
}

function injectHighlightMarker(
  element: HTMLElement,
  selector: CommentAnnotation['selector'],
  contents: string
) {
  if (!selector) {
    return ''
  }

  const parts = [
    contents.substring(0, selector.from),
    element.outerHTML,
    contents.substring(selector.to),
  ]

  return parts.join('')
}

const createHighlightElement = (
  comment: CommentAnnotation,
  position: string,
  content?: string
) => {
  const element = document.createElement('span')
  element.className = 'highlight-marker'
  element.setAttribute('id', comment._id)
  element.setAttribute('data-target-id', comment.target)
  element.setAttribute('data-position', position)
  if (content) {
    element.innerHTML = content
  }
  return element
}
