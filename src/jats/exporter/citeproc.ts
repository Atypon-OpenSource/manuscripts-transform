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

import { BibliographyItemAttrs } from '../../schema'

const normalizeID = (id: string) => id.replace(/:/g, '_')
const labelOnly = /^<label>.+<\/label>$/

/**
 * This is a hacky way to add JATS support to citeproc-js
 */
export const initJats = () => {
  // make sure initialization happens once
  if (Citeproc.Output.Formats.jats) {
    return
  }
  // This defines a new citeproc "format". There is no real documentation
  // for this, so the html format was copied and modified.
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
    // this is the entry point for rendering bibliography items. The "str" arg
    // will be the formatted bibliography item.
    '@bibliography/entry': function (state, str) {
      // the id of the bibliography item
      const id = this.system_id
      // get the bibliography item from the internal citeproc registry
      const item: BibliographyItemAttrs = state.registry.registry[id].ref
      const type = getPublicationType(item)
      str = str.trim()
      if (labelOnly.test(str)) {
        // If only a <label> is present in str, use the "literal" value of the
        // item. This is usually the case for "unstructured" references, where
        // no individual metadata is tagged. Since str includes the label, it's
        // placed before the <mixed-citation> tag.
        return `<ref id="${normalizeID(
          id
        )}">${str}<mixed-citation specific-use="unstructured-citation">${
          item.literal
        }</mixed-citation></ref>`
      } else if (str.includes('mixed-citation')) {
        // For citation styles that include a label (e.g. AMA), citeproc-js will
        // invoke both @display/left-margin and @display/right-inline, meaning
        // that str will include a <mixed-citation> tag. In that case, only the
        // <ref> tag needs to be added.
        return `<ref id="${normalizeID(id)}">${str.replace(
          '%%TYPE%%',
          type
        )}</ref>`
      } else {
        // For citation styles that do not include a label (e.g. Chicago Author),
        // citeproc-js will invoke neither @display/left-margin nor
        // @display/right-inline, meaning that str will not include a
        // <mixed-citation> tag. In that case, both <ref> and <mixed-citation>
        // need to be added.
        return `<ref id="${normalizeID(
          id
        )}"><mixed-citation publication-type="${type}">${str}</mixed-citation></ref>`
      }
    },
    '@display/block': false,
    '@display/left-margin': function (state, str) {
      return `<label>${str}</label>`
    },
    '@display/right-inline': function (state, str) {
      // this function doesn't have access to the metadat, so it's not possible
      // to determine the publication type here. Instead, a placeholder is used
      // and replaced in the @bibliography/entry function.
      return `<mixed-citation publication-type="%%TYPE%%">${str}</mixed-citation>`
    },
    '@display/indent': false,
    '@URL/true': false,
    '@DOI/true': false,
  }

  // This overrides how a person name is rendered and wraps it in
  // a <string-name> tag.
  const name = Citeproc.NameOutput.prototype._renderOnePersonalName
  Citeproc.NameOutput.prototype._renderOnePersonalName = function (...args) {
    const area = this.state.tmp.area
    const blob = name.call(this, ...args)
    if (blob && area === 'bibliography') {
      blob.strings.prefix = '<string-name>'
      blob.strings.suffix = '</string-name>'
    }
    return blob
  }

  // This overrides how the given name of a person is rendered
  // and wraps it in a <given-names> tag.
  const given = Citeproc.NameOutput.prototype._givenName
  Citeproc.NameOutput.prototype._givenName = function (...args) {
    const area = this.state.tmp.area
    const info = given.call(this, ...args)
    if (info.blob && area === 'bibliography') {
      info.blob.strings.prefix = '<given-names>'
      info.blob.strings.suffix = '</given-names>'
    }
    return info
  }

  // This overrides how the family name of a person is rendered
  // and wraps it in a <surname> tag.
  const family = Citeproc.NameOutput.prototype._familyName
  Citeproc.NameOutput.prototype._familyName = function (...args) {
    const area = this.state.tmp.area
    const blob = family.call(this, ...args)
    if (blob && area === 'bibliography') {
      blob.strings.prefix = '<surname>'
      blob.strings.suffix = '</surname>'
    }
    return blob
  }
}

const namesWrapper = (type: string) => (str: string) =>
  `<person-group person-group-type="${type}">${str}</person-group>`

// Even though the CSL data model specifies a date type, citeproc-js processes
// date fields and replaces their value with an object with the structure:
// {
//    year: number
//    month: number
//    day: number
// }
// see CSL.Engine.prototype.dateParseArray for more details.
const formatDate = (date) => {
  let output = date.year
  if (date.month) {
    output += '-' + String(date.month).padStart(2, '0')
    if (date.day) {
      output += '-' + String(date.day).padStart(2, '0')
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
  // this is a name field, so other processing is required. See the "initJats"
  // function for more info.
  author: namesWrapper('author'),
  // Unlike other date fields, where a formatted date string is wrapped in
  // a tag with the "iso-8601-date" attribute, the "issued" date components
  // are individually wrapped in year/month/day tags. For the time being,
  // only the year component is processed.
  issued: (str: string, item: BibliographyItemAttrs) =>
    str.replace(item.issued.year, `<year>${item.issued.year}</year>`),
  'container-title': (str: string) => `<source>${str}</source>`,
  volume: (str: string) => `<volume>${str}</volume>`,
  issue: (str: string) => `<issue>${str}</issue>`,
  supplement: (str: string) => `<supplement>${str}</supplement>`,
  page: (str: string) => {
    const parts = str.split(/([-–])/)
    if (parts.length === 3) {
      const fpage = parts[0].trim()
      const separator = parts[1].trim()
      const lpage = parts[2].trim()
      return `<fpage>${fpage}</fpage>${separator}<lpage>${lpage}</lpage>`
    }
    return `<fpage>${str.trim()}</fpage>`
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
  // this is a name field, so other processing is required. See the "initJats"
  // function for more info.
  editor: namesWrapper('editor'),
  accessed: (str: string, item: BibliographyItemAttrs) =>
    `<date-in-citation content-type="access-date" iso-8601-date="${formatDate(
      item.accessed
    )}">${str}</date-in-citation>`,
  'event-date': (str: string, item: BibliographyItemAttrs) =>
    `<conf-date iso-8601-date="${formatDate(
      item['event-date']
    )}">${str}</conf-date>`,
  DOI: (str: string) => `<pub-id pub-id-type="doi">${str}</pub-id>`,
  URL: (str: string) =>
    `<ext-link ext-link-type="uri" xlink:href="${str}">${str}</ext-link>`,
}

/**
 * A function that formats the CSL variables into JATS. This is a simple operation
 * in most cases: the passed string is wrapped with the appropriate tag
 * as is. However, some variables require special handling.
 */
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
