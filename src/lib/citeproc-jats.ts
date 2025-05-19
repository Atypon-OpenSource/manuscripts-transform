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
//@ts-nocheck

import Citeproc from 'citeproc'

import { BibliographyItemAttrs } from '../schema'

const normalizeID = (id: string) => id.replace(/:/g, '_')
const labelOnly = /^<label>.+<\/label>$/

export const initJats = () => {
  if (Citeproc.Output.Formats.jats) {
    return
  }
  Citeproc.Output.Formats.jats = {
    ...Citeproc.Output.Formats.html,
    text_escape: function (text) {
      return text ?? ''
    },
    bibstart: '<ref-list>',
    bibend: '</ref-list>',
    '@font-style/italic': '<italic>%%STRING%%</italic>',
    '@font-style/oblique': '<italic>%%STRING%%</italic>',
    '@font-style/normal': false,
    '@font-variant/small-caps': '<smallcaps>%%STRING%%</smallcaps>',
    '@font-variant/normal': false,
    '@font-weight/bold': '<bold>%%STRING%%</bold>',
    '@font-weight/normal': false,
    '@font-weight/light': false,
    '@text-decoration/none': false,
    '@text-decoration/underline': '<underline>%%STRING%%</underline>',
    '@vertical-align/sup': '<sup>%%STRING%%</sup>',
    '@vertical-align/sub': '<sub>%%STRING%%</sub>',
    '@vertical-align/baseline': false,
    '@bibliography/entry': function (state, str) {
      const id = this.system_id
      const item = state.registry.registry[id].ref
      const type = getPublicationType(item)
      str = str.trim()
      if (labelOnly.test(str)) {
        return `<ref id="${normalizeID(id)}">${str}<mixed-citation publication-type="${type}">${item.literal}</mixed-citation></ref>`
      } else if (str.includes('mixed-citation')) {
        return `<ref id="${normalizeID(id)}">${str.replace('%%TYPE%%', type)}</ref>`
      } else {
        return `<ref id="${normalizeID(id)}"><mixed-citation publication-type="${type}"></mixed-citation>${str}</ref>`
      }
    },
    '@display/block': false,
    '@display/left-margin': function (state, str) {
      return `<label>${str}</label>`
    },
    '@display/right-inline': function (state, str) {
      return `<mixed-citation publication-type="%%TYPE%%">${str}</mixed-citation>`
    },
    '@display/indent': false,
    '@URL/true': false,
    '@DOI/true': false,
  }

  const given = Citeproc.NameOutput.prototype._givenName
  Citeproc.NameOutput.prototype._givenName = function (...args) {
    const info = given.call(this, ...args)
    if (info.blob) {
      info.blob.strings.prefix = '<given-names>'
      info.blob.strings.suffix = '</given-names>'
    }
    return info
  }

  const family = Citeproc.NameOutput.prototype._familyName
  Citeproc.NameOutput.prototype._familyName = function (...args) {
    const blob = family.call(this, ...args)
    if (blob) {
      blob.strings.prefix = '<surname>'
      blob.strings.suffix = '</surname>'
    }
    return blob
  }

  const name = Citeproc.NameOutput.prototype._renderOnePersonalName
  Citeproc.NameOutput.prototype._renderOnePersonalName = function (...args) {
    const blob = name.call(this, ...args)
    if (blob) {
      blob.strings.prefix = '<string-name>'
      blob.strings.suffix = '</string-name>'
    }
    return blob
  }
}

const namesWrapper = (type: string) => (str: string) =>
  `<person-group person-group-type="${type}">${str}</person-group>`

// not csl.date
const formatDate = (date) => {
  let output = date.year
  if (date.month) {
    output += '-' + date.month
    if (date.day) {
      output += '-' + date.day
    }
  }
  return output
}

const getPublicationType = (item: BibliographyItemAttrs) => {
  switch (item.type) {
    case 'article-journal':
      return 'journal'
    case 'webpage':
      return 'page'
    case 'dataset':
      return 'data'
    default:
      return item.type
  }
}

const wrappers = {
  author: namesWrapper('author'),
  issued: (str: string, item: BibliographyItemAttrs) =>
    str.replace(item.issued.year, `<year>${item.issued.year}</year>`),
  'container-title': (str: string) => `<source>${str}</source>`,
  volume: (str: string) => `<volume>${str}</volume>`,
  issue: (str: string) => `<issue>${str}</issue>`,
  supplement: (str: string) => `<supplement>${str}</supplement>`,
  page: (str: string) => {
    let fpage = str
    let lpage
    const parts = str.split('-')

    if (parts.length === 2) {
      fpage = parts[0]
      lpage = parts[1]
    }
    str = str.replace(fpage, `<fpage>${fpage}</fpage>`)
    if (lpage) {
      str = str.replace(lpage, `<lpage>${lpage}</lpage>`)
    }
    return str
  },
  title: (str: string, item: BibliographyItemAttrs) => {
    const type = item.type
    switch (type) {
      case 'dataset':
        return `<data-title>${str}</data-title>`
      case 'article-journal':
      case 'preprint':
        return `<article-title>${str}</article-title>`
      default:
        return `<part-title>${str}</part-title>`
    }
  },
  std: (str: string) => `<pub-id pub-id-type="std-designation">${str}</pub-id>`,
  'collection-title': (str: string) => `<series>${str}</series>`,
  edition: (str: string) => `<edition>${str}</edition>`,
  publisher: (str: string) => `<publisher-name>${str}</publisher-name>`,
  'publisher-place': (str: string) => `<publisher-loc>${str}</publisher-loc>`,
  event: (str: string) => `<conf-name>${str}</conf-name>`,
  'event-place': (str: string) => `<conf-loc>${str}</conf-loc>`,
  'number-of-pages': (str: string) => `<size units="pages">${str}</size>`,
  institution: (str: string) => `<institution>${str}</institution>`,
  locator: (str: string) => `<elocation-id>${str}</elocation-id>`,
  editor: namesWrapper('editor'),
  accessed: (str: string, item: BibliographyItemAttrs) =>
    `<date-in-citation content-type="access-date" iso-8601-date="${formatDate(item.accessed)}">${str}</date-in-citation>`,
  'event-date': (str: string, item: BibliographyItemAttrs) =>
    `<conf-date iso-8601-date="${formatDate(item['event-date'])}">${str}</conf-date>`,
  DOI: (str: string) => `<pub-id pub-id-type="doi">${str}</pub-id>`,
  URL: (str: string) =>
    `<ext-link ext-link-type="uri" xlink:href="${str}">${str}</ext-link>`,
}

export const jatsVariableWrapper: Citeproc.VariableWrapper = (
  params,
  pre,
  str,
  post
) => {
  if (str && params.context === 'bibliography') {
    const name = params.variableNames[0]
    const fn = wrappers[name]
    if (fn) {
      str = fn(str, params.itemData)
    }
  }
  return `${pre}${str ?? ''}${post}`
}
