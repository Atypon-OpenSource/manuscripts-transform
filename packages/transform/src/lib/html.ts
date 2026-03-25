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

function decodeHTMLEntities(text: string) {
  // those entities that pertain to XML are supported and don't need to be replaced (e.g.: &amp, &quote etc)
  const entities = [
    ['#x27', "'"],
    ['#x2F', '/'],
    ['#39', "'"],
    ['#47', '/'],
    ['nbsp', ' '],
  ]

  for (let i = 0; i < entities.length; i++) {
    text = text.replace(
      new RegExp('&' + entities[i][0] + ';', 'g'),
      entities[i][1]
    )
  }

  return text
}

export const nodeFromHTML = (html: string) => {
  html = html.trim()

  if (!html.length) {
    return null
  }

  const template = document.createElement('template')

  template.innerHTML = html
  template.innerHTML = decodeHTMLEntities(template.innerHTML)
  return template.content.firstChild
}

export const textFromHTML = (html: string) => {
  const template = document.createElement('template')

  template.innerHTML = html
  return template.content.textContent
}
