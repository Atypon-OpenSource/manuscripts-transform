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

import {
  Affiliation,
  AuxiliaryObjectReference,
  BibliographyItem,
  Citation,
  Contributor,
  ContributorRole,
  Corresponding,
  Footnote,
  InlineStyle,
  Journal,
  Keyword,
  KeywordGroup,
  Manuscript,
  Model,
  ObjectTypes,
  Supplement,
} from '@manuscripts/json-schema'
import { buildCitations, CitationProvider } from '@manuscripts/library'
import debug from 'debug'
import { DOMOutputSpec, DOMParser, DOMSerializer } from 'prosemirror-model'
import serializeToXML from 'w3c-xmlserializer'

import { nodeFromHTML, textFromHTML } from '../lib/html'
import { normalizeStyleName } from '../lib/styled-content'
import { iterateChildren } from '../lib/utils'
import {
  CitationNode,
  isCitationNode,
  ManuscriptFragment,
  ManuscriptMark,
  ManuscriptNode,
  ManuscriptNodeType,
  Marks,
  Nodes,
  schema,
  TableElementNode,
} from '../schema'
import { generateAttachmentFilename } from '../transformer/filename'
import { buildTargets, Target } from '../transformer/labels'
import { isExecutableNodeType, isNodeType } from '../transformer/node-types'
import { hasObjectType } from '../transformer/object-types'
import {
  findManuscript,
  findManuscriptById,
  findTitles,
} from '../transformer/project-bundle'
import {
  chooseJatsFnType,
  chooseSecType,
} from '../transformer/section-category'
import { IDGenerator, MediaPathGenerator } from '../types'
import { selectVersionIds, Version } from './jats-versions'

interface Attrs {
  [key: string]: string
}

interface Links {
  self?: {
    [key: string]: string
  }
}
type CitationNodes = [CitationNode, number][]

type NodeSpecs = { [key in Nodes]: (node: ManuscriptNode) => DOMOutputSpec }

type MarkSpecs = {
  [key in Marks]: (mark: ManuscriptMark, inline: boolean) => DOMOutputSpec
}
const warn = debug('manuscripts-transform')

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const normalizeID = (id: string) => id.replace(/:/g, '_')

const parser = DOMParser.fromSchema(schema)

const findChildNodeOfType = (
  node: ManuscriptNode,
  nodeType: ManuscriptNodeType
) => {
  for (const child of iterateChildren(node)) {
    if (child.type === nodeType) {
      return child
    }
  }
}

const isContributor = hasObjectType<Contributor>(ObjectTypes.Contributor)

const CREDIT_VOCAB_IDENTIFIER =
  'https://dictionary.casrai.org/Contributor_Roles'

const chooseRoleVocabAttributes = (
  role: ContributorRole
): { [key: string]: string } => {
  if (role.uri && role.uri.startsWith(CREDIT_VOCAB_IDENTIFIER)) {
    return {
      vocab: 'credit',
      'vocab-identifier': CREDIT_VOCAB_IDENTIFIER,
      'vocab-term': role.name,
      'vocab-term-identifier': role.uri,
    }
  }

  return {
    vocab: 'uncontrolled',
  }
}

// siblings from https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/article-meta.html
const insertAbstractNode = (articleMeta: Element, abstractNode: Element) => {
  const siblings = [
    'kwd-group',
    'funding-group',
    'support-group',
    'conference',
    'counts',
    'custom-meta-group',
  ]

  for (const sibling of siblings) {
    const siblingNode = articleMeta.querySelector(`:scope > ${sibling}`)

    if (siblingNode) {
      articleMeta.insertBefore(abstractNode, siblingNode)
      return
    }
  }

  articleMeta.appendChild(abstractNode)
}

export const createCounter = () => {
  const counts = new Map<string, number>()

  return {
    increment: (field: string) => {
      const value = counts.get(field)
      const newValue = value === undefined ? 1 : value + 1
      counts.set(field, newValue)
      return newValue
    },
  }
}

const createDefaultIdGenerator = (): IDGenerator => {
  const counter = createCounter()

  return async (element: Element) => {
    const value = String(counter.increment(element.nodeName))

    return `${element.nodeName}-${value}`
  }
}

const chooseRefType = (objectType: string): string | undefined => {
  switch (objectType) {
    case ObjectTypes.Figure:
    case ObjectTypes.FigureElement:
      return 'fig'

    case ObjectTypes.Footnote:
      return 'fn' // TODO: table-fn

    case ObjectTypes.Table:
    case ObjectTypes.TableElement:
      return 'table'

    case ObjectTypes.Section:
      return 'sec'

    case ObjectTypes.Equation:
    case ObjectTypes.EquationElement:
      return 'disp-formula'
  }
}
export const defaultLocale =  '<?xml version="1.0" encoding="utf-8"?><locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US"><info><translator><name>Andrew Dunning</name></translator><translator><name>Sebastian Karcher</name></translator><translator><name>Rintze M. Zelle</name></translator><translator><name>Denis Meier</name></translator><translator><name>Brenton M. Wiernik</name></translator><rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights><updated>2015-10-10T23:31:02+00:00</updated></info><style-options punctuation-in-quote="true"/><date form="text"><date-part name="month" suffix=" "/><date-part name="day" suffix=", "/><date-part name="year"/></date><date form="numeric"><date-part name="month" form="numeric-leading-zeros" suffix="/"/><date-part name="day" form="numeric-leading-zeros" suffix="/"/><date-part name="year"/></date><terms><term name="advance-online-publication">advance online publication</term><term name="album">album</term><term name="audio-recording">audio recording</term><term name="film">film</term><term name="henceforth">henceforth</term><term name="loc-cit">loc. cit.</term><!-- like ibid., the abbreviated form is the regular form  --><term name="no-place">no place</term><term name="no-place" form="short">n.p.</term><term name="no-publisher">no publisher</term><!-- sine nomine --><term name="no-publisher" form="short">n.p.</term><term name="on">on</term><term name="op-cit">op. cit.</term><!-- like ibid., the abbreviated form is the regular form  --><term name="original-work-published">original work published</term><term name="personal-communication">personal communication</term><term name="podcast">podcast</term><term name="podcast-episode">podcast episode</term><term name="preprint">preprint</term><term name="radio-broadcast">radio broadcast</term><term name="radio-series">radio series</term><term name="radio-series-episode">radio series episode</term><term name="special-issue">special issue</term><term name="special-section">special section</term><term name="television-broadcast">television broadcast</term><term name="television-series">television series</term><term name="television-series-episode">television series episode</term><term name="video">video</term><term name="working-paper">working paper</term><term name="accessed">accessed</term><term name="and">and</term><term name="and others">and others</term><term name="anonymous">anonymous</term><term name="anonymous" form="short">anon.</term><term name="at">at</term><term name="available at">available at</term><term name="by">by</term><term name="circa">circa</term><term name="circa" form="short">c.</term><term name="cited">cited</term><term name="edition"><single>edition</single><multiple>editions</multiple></term><term name="edition" form="short">ed.</term><term name="et-al">et al.</term><term name="forthcoming">forthcoming</term><term name="from">from</term><term name="ibid">ibid.</term><term name="in">in</term><term name="in press">in press</term><term name="internet">internet</term><term name="letter">letter</term><term name="no date">no date</term><term name="no date" form="short">n.d.</term><term name="online">online</term><term name="presented at">presented at the</term><term name="reference"><single>reference</single><multiple>references</multiple></term><term name="reference" form="short"><single>ref.</single><multiple>refs.</multiple></term><term name="retrieved">retrieved</term><term name="scale">scale</term><term name="version">version</term><!-- LONG ITEM TYPE FORMS --><term name="article">preprint</term><term name="article-journal">journal article</term><term name="article-magazine">magazine article</term><term name="article-newspaper">newspaper article</term><term name="bill">bill</term><!-- book is in the list of locator terms --><term name="broadcast">broadcast</term><!-- chapter is in the list of locator terms --><term name="classic">classic</term><term name="collection">collection</term><term name="dataset">dataset</term><term name="document">document</term><term name="entry">entry</term><term name="entry-dictionary">dictionary entry</term><term name="entry-encyclopedia">encyclopedia entry</term><term name="event">event</term><!-- figure is in the list of locator terms --><term name="graphic">graphic</term><term name="hearing">hearing</term><term name="interview">interview</term><term name="legal_case">legal case</term><term name="legislation">legislation</term><term name="manuscript">manuscript</term><term name="map">map</term><term name="motion_picture">video recording</term><term name="musical_score">musical score</term><term name="pamphlet">pamphlet</term><term name="paper-conference">conference paper</term><term name="patent">patent</term><term name="performance">performance</term><term name="periodical">periodical</term><term name="personal_communication">personal communication</term><term name="post">post</term><term name="post-weblog">blog post</term><term name="regulation">regulation</term><term name="report">report</term><term name="review">review</term><term name="review-book">book review</term><term name="software">software</term><term name="song">audio recording</term><term name="speech">presentation</term><term name="standard">standard</term><term name="thesis">thesis</term><term name="treaty">treaty</term><term name="webpage">webpage</term><!-- SHORT ITEM TYPE FORMS --><term name="article-journal" form="short">journal art.</term><term name="article-magazine" form="short">mag. art.</term><term name="article-newspaper" form="short">newspaper art.</term><!-- book is in the list of locator terms --><!-- chapter is in the list of locator terms --><term name="document" form="short">doc.</term><!-- figure is in the list of locator terms --><term name="graphic" form="short">graph.</term><term name="interview" form="short">interv.</term><term name="manuscript" form="short">MS</term><term name="motion_picture" form="short">video rec.</term><term name="report" form="short">rep.</term><term name="review" form="short">rev.</term><term name="review-book" form="short">bk. rev.</term><term name="song" form="short">audio rec.</term><!-- HISTORICAL ERA TERMS --><term name="ad">AD</term><term name="bc">BC</term><term name="bce">BCE</term><term name="ce">CE</term><!-- PUNCTUATION --><term name="open-quote">“</term><term name="close-quote">”</term><term name="open-inner-quote">‘</term><term name="close-inner-quote">’</term><term name="page-range-delimiter">–</term><term name="colon">:</term><term name="comma">,</term><term name="semicolon">;</term><!-- ORDINALS --><term name="ordinal">th</term><term name="ordinal-01">st</term><term name="ordinal-02">nd</term><term name="ordinal-03">rd</term><term name="ordinal-11">th</term><term name="ordinal-12">th</term><term name="ordinal-13">th</term><!-- LONG ORDINALS --><term name="long-ordinal-01">first</term><term name="long-ordinal-02">second</term><term name="long-ordinal-03">third</term><term name="long-ordinal-04">fourth</term><term name="long-ordinal-05">fifth</term><term name="long-ordinal-06">sixth</term><term name="long-ordinal-07">seventh</term><term name="long-ordinal-08">eighth</term><term name="long-ordinal-09">ninth</term><term name="long-ordinal-10">tenth</term><!-- LONG LOCATOR FORMS --><term name="act"><single>act</single><multiple>acts</multiple></term><term name="appendix"><single>appendix</single><multiple>appendices</multiple></term><term name="article-locator"><single>article</single><multiple>articles</multiple></term><term name="canon"><single>canon</single><multiple>canons</multiple></term><term name="elocation"><single>location</single><multiple>locations</multiple></term><term name="equation"><single>equation</single><multiple>equations</multiple></term><term name="rule"><single>rule</single><multiple>rules</multiple></term><term name="scene"><single>scene</single><multiple>scenes</multiple></term><term name="table"><single>table</single><multiple>tables</multiple></term><term name="timestamp"><!-- generally blank --><single></single><multiple></multiple></term><term name="title-locator"><single>title</single><multiple>titles</multiple></term><term name="book"><single>book</single><multiple>books</multiple></term><term name="chapter"><single>chapter</single><multiple>chapters</multiple></term><term name="column"><single>column</single><multiple>columns</multiple></term><term name="figure"><single>figure</single><multiple>figures</multiple></term><term name="folio"><single>folio</single><multiple>folios</multiple></term><term name="issue"><single>number</single><multiple>numbers</multiple></term><term name="line"><single>line</single><multiple>lines</multiple></term><term name="note"><single>note</single><multiple>notes</multiple></term><term name="opus"><single>opus</single><multiple>opera</multiple></term><term name="page"><single>page</single><multiple>pages</multiple></term><term name="number-of-pages"><single>page</single><multiple>pages</multiple></term><term name="paragraph"><single>paragraph</single><multiple>paragraphs</multiple></term><term name="part"><single>part</single><multiple>parts</multiple></term><term name="section"><single>section</single><multiple>sections</multiple></term><term name="sub-verbo"><single>sub verbo</single><multiple>sub verbis</multiple></term><term name="verse"><single>verse</single><multiple>verses</multiple></term><term name="volume"><single>volume</single><multiple>volumes</multiple></term><!-- SHORT LOCATOR FORMS --><term name="appendix" form="short"><single>app.</single><multiple>apps.</multiple></term><term name="article-locator" form="short"><single>art.</single><multiple>arts.</multiple></term><term name="elocation" form="short"><single>loc.</single><multiple>locs.</multiple></term><term name="equation" form="short"><single>eq.</single><multiple>eqs.</multiple></term><term name="rule" form="short"><single>r.</single><multiple>rr.</multiple></term><term name="scene" form="short"><single>sc.</single><multiple>scs.</multiple></term><term name="table" form="short"><single>tbl.</single><multiple>tbls.</multiple></term><term name="timestamp" form="short"><!-- generally blank --><single></single><multiple></multiple></term><term name="title-locator" form="short"><single>tit.</single><multiple>tits.</multiple></term><term name="book" form="short"><single>bk.</single><multiple>bks.</multiple></term><term name="chapter" form="short"><single>chap.</single><multiple>chaps.</multiple></term><term name="column" form="short"><single>col.</single><multiple>cols.</multiple></term><term name="figure" form="short"><single>fig.</single><multiple>figs.</multiple></term><term name="folio" form="short"><single>fol.</single><multiple>fols.</multiple></term><term name="issue" form="short"><single>no.</single><multiple>nos.</multiple></term><term name="line" form="short"><single>l.</single><multiple>ll.</multiple></term><term name="note" form="short"><single>n.</single><multiple>nn.</multiple></term><term name="opus" form="short"><single>op.</single><multiple>opp.</multiple></term><term name="page" form="short"><single>p.</single><multiple>pp.</multiple></term><term name="number-of-pages" form="short"><single>p.</single><multiple>pp.</multiple></term><term name="paragraph" form="short"><single>para.</single><multiple>paras.</multiple></term><term name="part" form="short"><single>pt.</single><multiple>pts.</multiple></term><term name="section" form="short"><single>sec.</single><multiple>secs.</multiple></term><term name="sub-verbo" form="short"><single>s.v.</single><multiple>s.vv.</multiple></term><term name="verse" form="short"><single>v.</single><multiple>vv.</multiple></term><term name="volume" form="short"><single>vol.</single><multiple>vols.</multiple></term><!-- SYMBOL LOCATOR FORMS --><term name="paragraph" form="symbol"><single>¶</single><multiple>¶¶</multiple></term><term name="section" form="symbol"><single>§</single><multiple>§§</multiple></term><!-- LONG ROLE FORMS --><term name="chair"><single>chair</single><multiple>chairs</multiple></term><term name="compiler"><single>compiler</single><multiple>compilers</multiple></term><term name="contributor"><single>contributor</single><multiple>contributors</multiple></term><term name="curator"><single>curator</single><multiple>curators</multiple></term><term name="executive-producer"><single>executive producer</single><multiple>executive producers</multiple></term><term name="guest"><single>guest</single><multiple>guests</multiple></term><term name="host"><single>host</single><multiple>hosts</multiple></term><term name="narrator"><single>narrator</single><multiple>narrators</multiple></term><term name="organizer"><single>organizer</single><multiple>organizers</multiple></term><term name="performer"><single>performer</single><multiple>performers</multiple></term><term name="producer"><single>producer</single><multiple>producers</multiple></term><term name="script-writer"><single>writer</single><multiple>writers</multiple></term><term name="series-creator"><single>series creator</single><multiple>series creators</multiple></term><term name="director"><single>director</single><multiple>directors</multiple></term><term name="editor"><single>editor</single><multiple>editors</multiple></term><term name="editorial-director"><single>editor</single><multiple>editors</multiple></term><term name="illustrator"><single>illustrator</single><multiple>illustrators</multiple></term><term name="translator"><single>translator</single><multiple>translators</multiple></term><term name="editortranslator"><single>editor &amp; translator</single><multiple>editors &amp; translators</multiple></term><!-- SHORT ROLE FORMS --><term name="compiler" form="short"><single>comp.</single><multiple>comps.</multiple></term><term name="contributor" form="short"><single>contrib.</single><multiple>contribs.</multiple></term><term name="curator" form="short"><single>cur.</single><multiple>curs.</multiple></term><term name="executive-producer" form="short"><single>exec. prod.</single><multiple>exec. prods.</multiple></term><term name="narrator" form="short"><single>narr.</single><multiple>narrs.</multiple></term><term name="organizer" form="short"><single>org.</single><multiple>orgs.</multiple></term><term name="performer" form="short"><single>perf.</single><multiple>perfs.</multiple></term><term name="producer" form="short"><single>prod.</single><multiple>prods.</multiple></term><term name="script-writer" form="short"><single>writ.</single><multiple>writs.</multiple></term><term name="series-creator" form="short"><single>cre.</single><multiple>cres.</multiple></term><term name="director" form="short"><single>dir.</single><multiple>dirs.</multiple></term><term name="editor" form="short"><single>ed.</single><multiple>eds.</multiple></term><term name="editorial-director" form="short"><single>ed.</single><multiple>eds.</multiple></term><term name="illustrator" form="short"><single>ill.</single><multiple>ills.</multiple></term><term name="translator" form="short"><single>tran.</single><multiple>trans.</multiple></term><term name="editortranslator" form="short"><single>ed. &amp; tran.</single><multiple>eds. &amp; trans.</multiple></term><!-- VERB ROLE FORMS --><term name="chair" form="verb">chaired by</term><term name="compiler" form="verb">compiled by</term><term name="contributor" form="verb">with</term><term name="curator" form="verb">curated by</term><term name="executive-producer" form="verb">executive produced by</term><term name="guest" form="verb">with guest</term><term name="host" form="verb">hosted by</term><term name="narrator" form="verb">narrated by</term><term name="organizer" form="verb">organized by</term><term name="performer" form="verb">performed by</term><term name="producer" form="verb">produced by</term><term name="script-writer" form="verb">written by</term><term name="series-creator" form="verb">created by</term><term name="container-author" form="verb">by</term><term name="director" form="verb">directed by</term><term name="editor" form="verb">edited by</term><term name="editorial-director" form="verb">edited by</term><term name="illustrator" form="verb">illustrated by</term><term name="interviewer" form="verb">interview by</term><term name="recipient" form="verb">to</term><term name="reviewed-author" form="verb">by</term><term name="translator" form="verb">translated by</term><term name="editortranslator" form="verb">edited &amp; translated by</term><!-- SHORT VERB ROLE FORMS --><term name="compiler" form="verb-short">comp. by</term><term name="contributor" form="verb-short">w.</term><term name="curator" form="verb-short">cur. by</term><term name="executive-producer" form="verb-short">exec. prod. by</term><term name="guest" form="verb-short">w. guest</term><term name="host" form="verb-short">hosted by</term><term name="narrator" form="verb-short">narr. by</term><term name="organizer" form="verb-short">org. by</term><term name="performer" form="verb-short">perf. by</term><term name="producer" form="verb-short">prod. by</term><term name="script-writer" form="verb-short">writ. by</term><term name="series-creator" form="verb-short">cre. by</term><term name="director" form="verb-short">dir. by</term><term name="editor" form="verb-short">ed. by</term><term name="editorial-director" form="verb-short">ed. by</term><term name="illustrator" form="verb-short">illus. by</term><term name="translator" form="verb-short">trans. by</term><term name="editortranslator" form="verb-short">ed. &amp; trans. by</term><!-- LONG MONTH FORMS --><term name="month-01">January</term><term name="month-02">February</term><term name="month-03">March</term><term name="month-04">April</term><term name="month-05">May</term><term name="month-06">June</term><term name="month-07">July</term><term name="month-08">August</term><term name="month-09">September</term><term name="month-10">October</term><term name="month-11">November</term><term name="month-12">December</term><!-- SHORT MONTH FORMS --><term name="month-01" form="short">Jan.</term><term name="month-02" form="short">Feb.</term><term name="month-03" form="short">Mar.</term><term name="month-04" form="short">Apr.</term><term name="month-05" form="short">May</term><term name="month-06" form="short">Jun.</term><term name="month-07" form="short">Jul.</term><term name="month-08" form="short">Aug.</term><term name="month-09" form="short">Sep.</term><term name="month-10" form="short">Oct.</term><term name="month-11" form="short">Nov.</term><term name="month-12" form="short">Dec.</term><!-- SEASONS --><term name="season-01">Spring</term><term name="season-02">Summer</term><term name="season-03">Autumn</term><term name="season-04">Winter</term></terms></locale>'

const sortContributors = (a: Contributor, b: Contributor) =>
  Number(a.priority) - Number(b.priority)

export type CSLOptions = {
  style: string
  locale: string
}
export interface JATSExporterOptions {
  csl: CSLOptions
  version?: Version
  doi?: string
  id?: string
  frontMatterOnly?: boolean
  links?: Links
  citationType?: 'element' | 'mixed'
  idGenerator?: IDGenerator
  mediaPathGenerator?: MediaPathGenerator
}

export class JATSExporter {
  protected document: Document
  protected modelMap: Map<string, Model>
  protected models: Model[]
  protected serializer: DOMSerializer
  protected labelTargets?: Map<string, Target>
  protected citationTexts: Map<string, string>

  protected generateCitations(fragment: ManuscriptFragment) {
    const nodes: CitationNodes = []
    fragment.descendants((node, pos) => {
      if (isCitationNode(node)) {
        nodes.push([node, pos])
      }
    })
    return buildCitations(
      nodes.map((node) => this.modelMap.get(node[0].attrs.rid) as Citation),
      (id: string) => this.modelMap.get(id) as BibliographyItem | undefined
    )
  }
  protected generateCitationTexts(
    fragment: ManuscriptFragment,
    csl: CSLOptions
  ) {
    this.citationTexts = new Map<string, string>()
    const citationProvider = new CitationProvider({
      getLibraryItem: (id: string) =>
        this.modelMap.get(id) as BibliographyItem | undefined,
      locale: csl.locale,
      citationStyle: csl.style,
    })
    const citations = this.generateCitations(fragment)
    citationProvider
      .rebuildState(citations)
      .forEach(([id, noteIndex, output]) => {
        this.citationTexts.set(id, output)
      })
  }
  public serializeToJATS = async (
    fragment: ManuscriptFragment,
    modelMap: Map<string, Model>,
    manuscriptID: string,
    options: JATSExporterOptions
  ): Promise<string> => {
    const {
      version = '1.2',
      doi,
      id,
      frontMatterOnly = false,
      links,
      idGenerator,
      mediaPathGenerator,
      csl,
    } = options

    this.modelMap = modelMap
    this.models = Array.from(this.modelMap.values())
    if (csl?.style && csl.locale) {
      this.generateCitationTexts(fragment, csl)
    }
    this.createSerializer()

    const versionIds = selectVersionIds(version)

    this.document = document.implementation.createDocument(
      null,
      'article',
      document.implementation.createDocumentType(
        'article',
        versionIds.publicId,
        versionIds.systemId
      )
    )

    const article = this.document.documentElement

    article.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      XLINK_NAMESPACE
    )

    const front = this.buildFront(doi, id, links)
    article.appendChild(front)

    const manuscript: Manuscript = findManuscriptById(
      this.modelMap,
      manuscriptID
    )

    article.setAttribute('article-type', manuscript.articleType || 'other')

    if (!frontMatterOnly) {
      // TODO: format citations using template if citationType === 'mixed'
      // TODO: or convert existing bibliography data to JATS?
      this.labelTargets = buildTargets(fragment, manuscript)

      const body = this.buildBody(fragment)
      article.appendChild(body)
      const back = this.buildBack(body)
      this.moveCoiStatementToAuthorNotes(back, front)
      article.appendChild(back)
      this.unwrapBody(body)
      this.moveAbstracts(front, body)
      this.moveFloatsGroup(body, article)
      this.removeBackContainer(body)
      this.updateFootnoteTypes(front, back)
    }

    await this.rewriteIDs(idGenerator)
    if (mediaPathGenerator) {
      await this.rewriteMediaPaths(mediaPathGenerator)
    }
    this.rewriteCrossReferenceTypes()

    return serializeToXML(this.document)
  }

  private nodeFromJATS = (JATSFragment: string) => {
    JATSFragment = JATSFragment.trim()

    if (!JATSFragment.length) {
      return null
    }

    const template = this.document.createElement('template')

    template.innerHTML = JATSFragment

    return template.firstChild
  }

  protected rewriteCrossReferenceTypes = () => {
    const figRefs = this.document.querySelectorAll('xref[ref-type=fig][rid]')

    if (!figRefs.length) {
      return
    }

    for (const xref of figRefs) {
      const rid = xref.getAttribute('rid') // TODO: split?

      if (rid) {
        const nodeName = this.document.getElementById(rid)?.nodeName

        if (nodeName) {
          // https://jats.nlm.nih.gov/archiving/tag-library/1.2/attribute/ref-type.html
          switch (nodeName) {
            case 'table-wrap-group':
            case 'table-wrap':
            case 'table':
              xref.setAttribute('ref-type', 'table')
              break
          }
        }
      }
    }
  }

  protected rewriteMediaPaths = async (
    mediaPathGenerator: MediaPathGenerator
  ) => {
    for (const fig of this.document.querySelectorAll('fig')) {
      const parentID = fig.getAttribute('id') as string

      for (const graphic of fig.querySelectorAll('graphic')) {
        const newHref = await mediaPathGenerator(graphic, parentID)
        graphic.setAttributeNS(XLINK_NAMESPACE, 'href', newHref)
      }
    }

    for (const suppMaterial of this.document.querySelectorAll(
      'supplementary-material'
    )) {
      const newHref = await mediaPathGenerator(suppMaterial, suppMaterial.id)
      suppMaterial.setAttributeNS(XLINK_NAMESPACE, 'href', newHref)
    }
  }

  protected rewriteIDs = async (
    idGenerator: IDGenerator = createDefaultIdGenerator()
  ) => {
    const idMap = new Map<string, string | null>()

    for (const element of this.document.querySelectorAll('[id]')) {
      const previousID = element.getAttribute('id')

      const newID = await idGenerator(element)

      if (newID) {
        element.setAttribute('id', newID)
      } else {
        element.removeAttribute('id')
      }

      if (previousID) {
        idMap.set(previousID, newID)
      }
    }

    for (const node of this.document.querySelectorAll('[rid]')) {
      const rids = node.getAttribute('rid')

      if (rids) {
        const newRIDs = rids
          .split(/\s+/)
          .filter(Boolean)
          .map((previousRID) => idMap.get(previousRID))
          .filter(Boolean) as string[]

        if (newRIDs.length) {
          node.setAttribute('rid', newRIDs.join(' '))
        }
      }
    }
  }

  protected setTitleContent = (element: HTMLElement, title: string) => {
    const htmlTitleNode = nodeFromHTML(`<h1>${title}</h1>`)

    if (htmlTitleNode) {
      // TODO: parse and serialize with title schema
      const titleNode = parser.parse(htmlTitleNode, {
        topNode: schema.nodes.section_title.create(),
      })

      const jatsTitleNode = this.serializeNode(titleNode)

      while (jatsTitleNode.firstChild) {
        element.appendChild(jatsTitleNode.firstChild)
      }
    }
  }

  protected buildFront = (doi?: string, id?: string, links?: Links) => {
    const manuscript = findManuscript(this.modelMap)
    const titles = findTitles(this.modelMap)

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/front.html
    const front = this.document.createElement('front')

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/journal-meta.html
    const journalMeta = this.document.createElement('journal-meta')
    front.appendChild(journalMeta)

    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/article-meta.html
    const articleMeta = this.document.createElement('article-meta')
    front.appendChild(articleMeta)

    const journal = [...this.modelMap.values()].find(
      (model) => model.objectType === ObjectTypes.Journal
    ) as Journal | undefined

    if (journal) {
      if (journal.journalIdentifiers) {
        for (const item of journal.journalIdentifiers) {
          const element = this.document.createElement('journal-id')
          if (item.journalIDType) {
            element.setAttribute('journal-id-type', item.journalIDType)
          }
          element.textContent = item.journalID
          journalMeta.appendChild(element)
        }
      }

      if (journal.title || journal.abbreviatedTitles) {
        const parentElement = this.document.createElement('journal-title-group')
        journalMeta.appendChild(parentElement)

        if (journal.title) {
          const element = this.document.createElement('journal-title')
          element.textContent = journal.title
          parentElement.appendChild(element)
        }

        if (journal.abbreviatedTitles) {
          for (const item of journal.abbreviatedTitles) {
            const element = this.document.createElement('abbrev-journal-title')
            if (item.abbrevType) {
              element.setAttribute('abbrev-type', item.abbrevType)
            }
            element.textContent = item.abbreviatedTitle
            parentElement.appendChild(element)
          }
        }
      }

      if (journal.ISSNs) {
        for (const item of journal.ISSNs) {
          const element = this.document.createElement('issn')
          if (item.publicationType) {
            element.setAttribute('pub-type', item.publicationType)
          }
          element.textContent = item.ISSN
          journalMeta.appendChild(element)
        }
      }

      if (journal.publisherName) {
        const publisher = this.document.createElement('publisher')
        const publisherName = this.document.createElement('publisher-name')
        publisherName.textContent = journal.publisherName
        publisher.appendChild(publisherName)
        journalMeta.appendChild(publisher)
      }
    }
    if (id) {
      const articleID = this.document.createElement('article-id')
      articleID.setAttribute('pub-id-type', 'publisher-id')
      articleID.textContent = id
      articleMeta.appendChild(articleID)
    }

    if (doi) {
      const articleID = this.document.createElement('article-id')
      articleID.setAttribute('pub-id-type', 'doi')
      articleID.textContent = doi
      articleMeta.appendChild(articleID)
    }

    const titleGroup = this.document.createElement('title-group')
    articleMeta.appendChild(titleGroup)

    this.buildContributors(articleMeta)

    if (links && links.self) {
      for (const [key, value] of Object.entries(links.self)) {
        const link = this.document.createElement('self-uri')
        link.setAttribute('content-type', key)
        link.setAttributeNS(XLINK_NAMESPACE, 'href', value)
        articleMeta.appendChild(link)
      }
    }

    if (titles.title) {
      const element = this.document.createElement('article-title')
      this.setTitleContent(element, titles.title)
      titleGroup.appendChild(element)
    }

    if (titles.subtitle) {
      const element = this.document.createElement('subtitle')
      this.setTitleContent(element, titles.subtitle)
      titleGroup.appendChild(element)
    }

    if (titles.runningTitle) {
      const element = this.document.createElement('alt-title')
      element.setAttribute('alt-title-type', 'right-running')
      this.setTitleContent(element, titles.runningTitle)
      titleGroup.appendChild(element)
    }

    const supplements = [...this.modelMap.values()].filter(
      (model) => model.objectType === ObjectTypes.Supplement
    ) as Supplement[] | undefined
    if (supplements && supplements.length > 0) {
      for (const supplement of supplements) {
        const supplementaryMaterial = this.document.createElement(
          'supplementary-material'
        )
        supplementaryMaterial.setAttribute('id', normalizeID(supplement._id))
        supplementaryMaterial.setAttributeNS(
          XLINK_NAMESPACE,
          'href',
          supplement.href ?? ''
        )
        const mimeType = supplement.MIME?.split('/')[0]
        const mimeSubType = supplement.MIME?.split('/')[1]
        supplementaryMaterial.setAttribute('mimetype', mimeType ?? '')
        supplementaryMaterial.setAttribute('mime-subtype', mimeSubType ?? '')
        const caption = this.document.createElement('caption')
        const title = this.document.createElement('title')
        title.textContent = supplement.title ?? ''
        caption.append(title)
        supplementaryMaterial.append(caption)
        articleMeta.append(supplementaryMaterial)
      }
    }

    const history =
      articleMeta.querySelector('history') ||
      this.document.createElement('history')

    if (manuscript.acceptanceDate) {
      const date = this.buildDateElement(manuscript.acceptanceDate, 'accepted')
      history.appendChild(date)
    }
    if (manuscript.correctionDate) {
      const date = this.buildDateElement(manuscript.correctionDate, 'corrected')
      history.appendChild(date)
    }
    if (manuscript.retractionDate) {
      const date = this.buildDateElement(manuscript.retractionDate, 'retracted')
      history.appendChild(date)
    }
    if (manuscript.receiveDate) {
      const date = this.buildDateElement(manuscript.receiveDate, 'received')
      history.appendChild(date)
    }
    if (manuscript.revisionReceiveDate) {
      const date = this.buildDateElement(
        manuscript.revisionReceiveDate,
        'rev-recd'
      )
      history.appendChild(date)
    }
    if (manuscript.revisionRequestDate) {
      const date = this.buildDateElement(
        manuscript.revisionRequestDate,
        'rev-request'
      )
      history.appendChild(date)
    }

    if (history.childElementCount) {
      articleMeta.appendChild(history)
    }

    this.buildKeywords(articleMeta)

    let countingElements = []
    if (manuscript.genericCounts) {
      const elements = manuscript.genericCounts.map(
        (el: { count: number; countType: string }) => {
          const countingElement = this.buildCountingElement('count', el.count)
          if (countingElement) {
            countingElement.setAttribute('count-type', el.countType)
          }
          return countingElement
        }
      )
      countingElements.push(...elements)
    }

    countingElements.push(
      this.buildCountingElement('fig-count', manuscript.figureCount)
    )

    countingElements.push(
      this.buildCountingElement('table-count', manuscript.tableCount)
    )

    countingElements.push(
      this.buildCountingElement('equation-count', manuscript.equationCount)
    )

    countingElements.push(
      this.buildCountingElement('ref-count', manuscript.referencesCount)
    )

    countingElements.push(
      this.buildCountingElement('word-count', manuscript.wordCount)
    )

    countingElements = countingElements.filter((el) => el) as Array<HTMLElement>
    if (countingElements.length > 0) {
      const counts = this.document.createElement('counts')
      counts.append(...countingElements)
      articleMeta.append(counts)
    }

    if (!journalMeta.hasChildNodes()) {
      journalMeta.remove()
    }

    return front
  }

  protected buildDateElement = (timestamp: number, type: string) => {
    const dateElement = this.document.createElement('date')

    dateElement.setAttribute('date-type', type)

    const date = new Date(timestamp * 1000) // s => ms
    const lookup = {
      year: date.getUTCFullYear().toString(),
      month: date.getUTCMonth().toString(),
      day: date.getUTCDate().toString(),
    }

    for (const [key, value] of Object.entries(lookup).reverse()) {
      const el = this.document.createElement(key)
      el.textContent = value
      dateElement.appendChild(el)
    }

    return dateElement
  }
  protected buildCountingElement = (
    tagName: string,
    count: number | undefined
  ) => {
    if (count) {
      const wordCount = this.document.createElement(tagName)
      wordCount.setAttribute('count', String(count))
      return wordCount
    }
  }
  protected buildBody = (fragment: ManuscriptFragment) => {
    const content = this.serializeFragment(fragment)
    const body = this.document.createElement('body')
    body.appendChild(content)

    this.fixBody(body, fragment)

    return body
  }

  protected buildBack = (body: HTMLElement) => {
    const back = this.document.createElement('back')
    this.moveSectionsToBack(back, body)

    // footnotes elements in footnotes section (i.e. not in table footer)
    const footnotesElements = this.document.querySelectorAll('sec > fn-group')

    for (const footnotesElement of footnotesElements) {
      // move fn-group from body to back
      const previousParent = footnotesElement.parentElement
      back.appendChild(footnotesElement)

      if (previousParent) {
        const title = previousParent.querySelector('title')
        if (title) {
          footnotesElement.insertBefore(
            title,
            footnotesElement.firstElementChild
          )
        }
        if (!previousParent.childElementCount) {
          previousParent.remove()
        }
      }
    }

    // bibliography element
    let refList = this.document.querySelector('ref-list')
    if (!refList) {
      warn('No bibliography element, creating a ref-list anyway')
      refList = this.document.createElement('ref-list')
    }

    // move ref-list from body to back
    back.appendChild(refList)

    const bibliographyItems = this.models.filter(
      hasObjectType<BibliographyItem>(ObjectTypes.BibliographyItem)
    )

    for (const bibliographyItem of bibliographyItems) {
      const ref = this.document.createElement('ref')
      ref.setAttribute('id', normalizeID(bibliographyItem._id))
      // TODO: add option for mixed-citation; format citations using template

      // TODO: add citation elements depending on publication type

      const updateCitationPubType = (
        citationEl: HTMLElement,
        pubType: string
      ) => {
        if (pubType) {
          switch (pubType) {
            case 'article':
            case 'article-journal':
              citationEl.setAttribute('publication-type', 'journal')
              break
            default:
              citationEl.setAttribute('publication-type', pubType)
              break
          }
        } else {
          citationEl.setAttribute('publication-type', 'journal')
        }
      }
      // in case a literal was found in a bibItem the rest of the attributes are ignored
      // since the literal att should only be populated when the mixed-citation fails to parse
      if (bibliographyItem.literal) {
        const mixedCitation = this.document.createElement('mixed-citation')
        updateCitationPubType(mixedCitation, bibliographyItem.type)
        mixedCitation.textContent = bibliographyItem.literal
        ref.appendChild(mixedCitation)
        refList.appendChild(ref)
      } else {
        const citation = this.document.createElement('element-citation')
        updateCitationPubType(citation, bibliographyItem.type)
        if (bibliographyItem.author) {
          const personGroupNode = this.document.createElement('person-group')
          personGroupNode.setAttribute('person-group-type', 'author')
          citation.appendChild(personGroupNode)

          bibliographyItem.author.forEach((author) => {
            const name = this.document.createElement('string-name')

            if (author.family) {
              const node = this.document.createElement('surname')
              node.textContent = author.family
              name.appendChild(node)
            }
            if (author.given) {
              const node = this.document.createElement('given-names')
              node.textContent = author.given
              name.appendChild(node)
            }
            if (name.hasChildNodes()) {
              personGroupNode.appendChild(name)
            }

            if (author.literal) {
              const collab = this.document.createElement('collab')
              collab.textContent = author.literal
              personGroupNode.appendChild(collab)
            }
          })
        }

        if (bibliographyItem.issued) {
          const dateParts = bibliographyItem.issued['date-parts']

          if (dateParts && dateParts.length) {
            const [[year, month, day]] = dateParts

            if (year) {
              const node = this.document.createElement('year')
              node.textContent = String(year)
              citation.appendChild(node)
            }

            if (month) {
              const node = this.document.createElement('month')
              node.textContent = String(month)
              citation.appendChild(node)
            }

            if (day) {
              const node = this.document.createElement('day')
              node.textContent = String(day)
              citation.appendChild(node)
            }
          }
        }

        if (bibliographyItem.title) {
          const node = this.document.createElement('article-title')
          this.setTitleContent(node, bibliographyItem.title)
          citation.appendChild(node)
        }

        if (bibliographyItem['container-title']) {
          const node = this.document.createElement('source')
          node.textContent = bibliographyItem['container-title']
          citation.appendChild(node)
        }

        if (bibliographyItem.volume) {
          const node = this.document.createElement('volume')
          node.textContent = String(bibliographyItem.volume)
          citation.appendChild(node)
        }

        if (bibliographyItem.issue) {
          const node = this.document.createElement('issue')
          node.textContent = String(bibliographyItem.issue)
          citation.appendChild(node)
        }

        if (bibliographyItem.supplement) {
          const node = this.document.createElement('supplement')
          node.textContent = bibliographyItem.supplement
          citation.appendChild(node)
        }

        if (bibliographyItem.page) {
          const pageString = String(bibliographyItem.page)

          if (/^\d+$/.test(pageString)) {
            const node = this.document.createElement('fpage')
            node.textContent = pageString
            citation.appendChild(node)
          } else if (/^\d+-\d+$/.test(pageString)) {
            const [fpage, lpage] = pageString.split('-')

            const fpageNode = this.document.createElement('fpage')
            fpageNode.textContent = fpage
            citation.appendChild(fpageNode)

            const lpageNode = this.document.createElement('lpage')
            lpageNode.textContent = lpage
            citation.appendChild(lpageNode)
          } else {
            // TODO: check page-range contents?
            const node = this.document.createElement('page-range')
            node.textContent = pageString
            citation.appendChild(node)
          }
        }
        if (bibliographyItem.DOI) {
          const node = this.document.createElement('pub-id')
          node.setAttribute('pub-id-type', 'doi')
          node.textContent = String(bibliographyItem.DOI)
          citation.appendChild(node)
        }

        ref.appendChild(citation)
        refList.appendChild(ref)
      }
    }

    return back
  }

  protected createSerializer = () => {
    const getModel = <T extends Model>(id?: string) =>
      id ? (this.modelMap.get(id) as T | undefined) : undefined

    const nodes: NodeSpecs = {
      title: () => '',
      affiliations_section: () => '',
      contributors_section: () => '',
      table_element_footer: () => ['table-wrap-foot', 0],
      contributor: () => '',
      affiliation: () => '',
      meta_section: () => '',
      attribution: () => ['attrib', 0],
      bibliography_element: () => '',
      bibliography_item: () => '',
      comment_list: () => '',
      keywords_group: () => '',
      bibliography_section: (node) => [
        'ref-list',
        { id: normalizeID(node.attrs.id) },
        0,
      ],
      blockquote_element: () => ['disp-quote', { 'content-type': 'quote' }, 0],
      bullet_list: () => ['list', { 'list-type': 'bullet' }, 0],
      caption: () => ['p', 0],
      caption_title: (node) => {
        if (!node.textContent) {
          return ''
        }
        return ['title', 0]
      },
      citation: (node) => {
        if (!node.attrs.rid) {
          warn(`${node.attrs.id} has no rid`)
          return node.attrs.label
        }

        const rids = (
          node.attrs
            .embeddedCitationItems as CitationNode['attrs']['embeddedCitationItems']
        ).filter((item) => {
          if (!this.modelMap.has(item.bibliographyItem)) {
            warn(
              `Missing ${item.bibliographyItem} referenced by ${node.attrs.rid}`
            )
            return false
          }

          return true
        })

        if (!rids.length) {
          warn(`${node.attrs.rid} has no confirmed rids`)
          return ''
        }

        const xref = this.document.createElement('xref')
        xref.setAttribute('ref-type', 'bibr')

        // NOTE: https://www.ncbi.nlm.nih.gov/pmc/pmcdoc/tagging-guidelines/article/tags.html#el-xref
        xref.setAttribute(
          'rid',
          rids.map((item) => normalizeID(item.bibliographyItem)).join(' ')
        )

        const generatedCitationContent = this.citationTexts.get(node.attrs.rid)

        if (generatedCitationContent) {
          xref.textContent = generatedCitationContent
        } else if (node.attrs.contents) {
          // TODO: convert markup to JATS?
          // xref.innerHTML = node.attrs.contents
          const text = textFromHTML(node.attrs.contents)

          if (text !== null && text.length) {
            xref.textContent = text
          }
        }

        return xref
      },
      cross_reference: (node) => {
        if (!node.attrs.rid) {
          warn(`${node.attrs.id} has no rid`)
          return node.attrs.label
        }

        const auxiliaryObjectReference = getModel<AuxiliaryObjectReference>(
          node.attrs.rid
        )

        if (!auxiliaryObjectReference) {
          warn(`Missing model ${node.attrs.rid}`)
          return node.attrs.label
        }

        const xref = this.document.createElement('xref')
        const referencedObject = getModel<Model>(
          auxiliaryObjectReference.referencedObject ||
            (auxiliaryObjectReference?.referencedObjects &&
              auxiliaryObjectReference.referencedObjects[0])
        )

        if (referencedObject) {
          const refType = chooseRefType(referencedObject.objectType)

          if (refType) {
            xref.setAttribute('ref-type', refType)
          } else {
            warn(`Unset ref-type for objectType ${referencedObject.objectType}`)
          }
        }

        const getReferencedObjectId = (referencedObject: string) => {
          return normalizeID(referencedObject)
        }

        if (auxiliaryObjectReference.referencedObjects) {
          const rid = auxiliaryObjectReference.referencedObjects
            ?.map((referencedObject) => getReferencedObjectId(referencedObject))
            .join(' ')
          xref.setAttribute('rid', rid)
        }
        if (auxiliaryObjectReference.referencedObject) {
          const rid = getReferencedObjectId(
            auxiliaryObjectReference.referencedObject
          )
          xref.setAttribute('rid', rid)
        }

        xref.textContent = node.attrs.customLabel || node.attrs.label

        return xref
      },
      doc: () => '',
      equation: (node) => {
        const formula = this.document.createElement('disp-formula')
        formula.setAttribute('id', normalizeID(node.attrs.id))

        // const alternatives = this.document.createElement('alternatives')
        // formula.appendChild(alternatives)

        if (node.attrs.TeXRepresentation) {
          const math = this.document.createElement('tex-math')
          math.textContent = node.attrs.TeXRepresentation
          formula.appendChild(math)
        } else if (node.attrs.MathMLStringRepresentation) {
          const math = this.nodeFromJATS(node.attrs.MathMLStringRepresentation)
          if (math) {
            formula.appendChild(math)
          }
        }

        return formula
      },
      equation_element: (node) =>
        createFigureElement(
          node,
          'fig',
          node.type.schema.nodes.equation,
          'equation'
        ),
      figcaption: (node) => {
        if (!node.textContent) {
          return ''
        }
        return ['caption', 0]
      },
      figure: (node) => {
        const graphic = this.document.createElement('graphic')
        const filename = generateAttachmentFilename(
          node.attrs.id,
          node.attrs.contentType
        )
        graphic.setAttributeNS(
          XLINK_NAMESPACE,
          'xlink:href',
          `graphic/${filename}`
        )

        if (node.attrs.contentType) {
          const [mimeType, mimeSubType] = node.attrs.contentType.split('/')

          if (mimeType) {
            graphic.setAttribute('mimetype', mimeType)

            if (mimeSubType) {
              graphic.setAttribute('mime-subtype', mimeSubType)
            }
          }
        }

        return graphic
      },
      figure_element: (node) =>
        createFigureElement(
          node,
          'fig',
          node.type.schema.nodes.figure,
          'figure'
        ),
      footnote: (node) => {
        const attrs: Attrs = {}

        if (node.attrs.id) {
          attrs.id = normalizeID(node.attrs.id)
        }

        if (node.attrs.category) {
          attrs['fn-type'] = node.attrs.category
        }

        return ['fn', attrs, 0]
      },
      footnotes_element: (node) => {
        const kind = node.attrs.kind
        let tag = 'fn-group'

        if (kind && kind.includes('table')) {
          tag = 'table-wrap-foot'
        }

        return [tag, { id: normalizeID(node.attrs.id) }, 0]
      },
      footnotes_section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
          'sec-type': 'endnotes', // chooseSecType(node.attrs.category),
        }

        return ['sec', attrs, 0]
      },
      hard_break: () => ['break'],
      highlight_marker: () => '',
      inline_equation: (node) => {
        const formula = this.document.createElement('inline-formula')
        formula.setAttribute('id', normalizeID(node.attrs.id))
        if (node.attrs.TeXRepresentation) {
          const math = this.document.createElement('tex-math')
          math.textContent = node.attrs.TeXRepresentation
          formula.appendChild(math)
        } else if (node.attrs.MathMLRepresentation) {
          const math = this.nodeFromJATS(node.attrs.MathMLRepresentation)
          if (math) {
            formula.appendChild(math)
          }
        } else if (node.attrs.SVGRepresentation) {
          const math = this.nodeFromJATS(node.attrs.SVGRepresentation)
          if (math) {
            formula.appendChild(math)
          }
        }

        return formula
      },
      inline_footnote: (node) => {
        const xref = this.document.createElement('xref')
        xref.setAttribute('ref-type', 'fn')
        xref.setAttribute('rid', normalizeID(node.attrs.rid))
        xref.textContent = node.attrs.contents

        return xref
      },
      keyword: () => '',
      keywords_element: () => '',
      keywords_section: () => '',
      link: (node) => {
        const text = node.textContent

        if (!text) {
          return ''
        }

        if (!node.attrs.href) {
          return text
        }

        const linkNode = this.document.createElement('ext-link')
        linkNode.setAttribute('ext-link-type', 'uri')
        linkNode.setAttributeNS(XLINK_NAMESPACE, 'href', node.attrs.href)
        linkNode.textContent = text

        if (node.attrs.title) {
          linkNode.setAttributeNS(
            XLINK_NAMESPACE,
            'xlink:title',
            node.attrs.title
          )
        }

        return linkNode
      },
      list_item: () => ['list-item', 0],
      listing: (node) => {
        const code = this.document.createElement('code')
        code.setAttribute('id', normalizeID(node.attrs.id))
        code.setAttribute('language', node.attrs.languageKey)
        code.textContent = node.attrs.contents

        return code
      },
      listing_element: (node) =>
        createFigureElement(
          node,
          'fig',
          node.type.schema.nodes.listing,
          'listing'
        ),
      manuscript: (node) => ['article', { id: normalizeID(node.attrs.id) }, 0],
      missing_figure: () => {
        const graphic = this.document.createElement('graphic')
        graphic.setAttribute('specific-use', 'MISSING')
        graphic.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', '')
        return graphic
      },
      ordered_list: (node) => [
        'list',
        { 'list-type': node.attrs.listStyleType ?? 'order' },
        0,
      ],
      paragraph: (node) => {
        if (!node.childCount) {
          return ''
        }

        const attrs: Attrs = {}

        if (node.attrs.id) {
          attrs.id = normalizeID(node.attrs.id)
        }

        if (node.attrs.contentType) {
          attrs['content-type'] = node.attrs.contentType
        }

        return ['p', attrs, 0]
      },
      placeholder: () => {
        return this.document.createElement('boxed-text')
      },
      placeholder_element: () => {
        return this.document.createElement('boxed-text')
      },
      pullquote_element: () => [
        'disp-quote',
        { 'content-type': 'pullquote' },
        0,
      ],
      graphical_abstract_section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }
        attrs['sec-type'] = 'abstract-graphical'

        return ['sec', attrs, 0]
      },
      section: (node) => {
        const attrs: { [key: string]: string } = {
          id: normalizeID(node.attrs.id),
        }

        if (node.attrs.category) {
          attrs['sec-type'] = chooseSecType(node.attrs.category)
        }

        return ['sec', attrs, 0]
      },
      section_label: () => ['label', 0],
      section_title: () => ['title', 0],
      section_title_plain: () => ['title', 0],
      table: (node) => ['table', { id: normalizeID(node.attrs.id) }, 0],
      table_element: (node) => {
        const element = createTableElement(node)
        element.setAttribute('position', 'anchor')
        return element
      },
      table_body: () => ['tbody', 0],
      table_cell: (node) => [
        node.attrs.celltype,
        {
          valign: node.attrs.valign,
          align: node.attrs.align,
          scope: node.attrs.scope,
          style: node.attrs.style,
          ...(node.attrs.rowspan > 1 && { rowspan: node.attrs.rowspan }),
          ...(node.attrs.colspan > 1 && { colspan: node.attrs.colspan }),
        },
        0,
      ],
      table_row: () => ['tr', 0],
      table_col: (node) => ['col', { width: node.attrs.width }],
      table_colgroup: () => ['colgroup', 0],
      text: (node) => node.text as string,
      toc_element: () => '',
      toc_section: () => '',
      comment: () => '',
    }

    const marks: MarkSpecs = {
      bold: () => ['bold'],
      code: () => ['code', { position: 'anchor' }],
      italic: () => ['italic'],
      smallcaps: () => ['sc'],
      strikethrough: () => ['strike'],
      styled: (mark) => {
        const inlineStyle = getModel<InlineStyle>(mark.attrs.rid)

        const attrs: { [key: string]: string } = {}

        if (inlineStyle && inlineStyle.title) {
          attrs.style = normalizeStyleName(inlineStyle.title)
        }

        return ['styled-content', attrs]
      },
      superscript: () => ['sup'],
      subscript: () => ['sub'],
      underline: () => ['underline'],
      tracked_insert: () => ['ins'],
      tracked_delete: () => ['del'],
    }

    this.serializer = new DOMSerializer(nodes, marks)

    const processChildNodes = (
      element: HTMLElement,
      node: ManuscriptNode,
      contentNodeType: ManuscriptNodeType
    ) => {
      node.forEach((childNode) => {
        if (childNode.type === contentNodeType) {
          if (childNode.attrs.id) {
            element.appendChild(this.serializeNode(childNode))
          }
        } else if (childNode.type === node.type.schema.nodes.paragraph) {
          element.appendChild(this.serializeNode(childNode))
        } else if (childNode.type === node.type.schema.nodes.missing_figure) {
          element.appendChild(this.serializeNode(childNode))
        }
      })
    }
    const createElement = (node: ManuscriptNode, nodeName: string) => {
      const element = this.document.createElement(nodeName)
      element.setAttribute('id', normalizeID(node.attrs.id))
      return element
    }

    const appendLabels = (element: HTMLElement, node: ManuscriptNode) => {
      if (node.attrs.label) {
        const label = this.document.createElement('label')
        label.textContent = node.attrs.label
        element.appendChild(label)
      } else if (this.labelTargets) {
        const target = this.labelTargets.get(node.attrs.id)

        if (target) {
          const label = this.document.createElement('label')
          label.textContent = target.label
          element.appendChild(label)
        }
      }
    }
    const appendAttributions = (element: HTMLElement, node: ManuscriptNode) => {
      if (node.attrs.attribution) {
        const attribution = this.document.createElement('attrib')
        attribution.textContent = node.attrs.attribution.literal
        element.appendChild(attribution)
      }
    }
    const appendChildNodeOfType = (
      element: HTMLElement,
      node: ManuscriptNode,
      type: ManuscriptNodeType
    ) => {
      const childNode = findChildNodeOfType(node, type)
      if (childNode) {
        element.appendChild(this.serializeNode(childNode))
      }
    }
    const createFigureElement = (
      node: ManuscriptNode,
      nodeName: string,
      contentNodeType: ManuscriptNodeType,
      figType?: string
    ) => {
      const element = createElement(node, nodeName)

      if (figType) {
        element.setAttribute('fig-type', figType)
      }
      appendLabels(element, node)
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
      appendChildNodeOfType(
        element,
        node,
        node.type.schema.nodes.footnotes_element
      )
      processChildNodes(element, node, contentNodeType)
      appendAttributions(element, node)
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, element)
      }

      return element
    }
    const createTableElement = (node: ManuscriptNode) => {
      const nodeName = 'table-wrap'
      const element = createElement(node, nodeName)
      appendLabels(element, node)
      appendChildNodeOfType(element, node, node.type.schema.nodes.figcaption)
      appendChildNodeOfType(element, node, node.type.schema.nodes.table)
      appendChildNodeOfType(
        element,
        node,
        node.type.schema.nodes.table_element_footer
      )
      if (isExecutableNodeType(node.type)) {
        processExecutableNode(node, element)
      }
      return element
    }

    const processExecutableNode = (node: ManuscriptNode, element: Element) => {
      const listingNode = findChildNodeOfType(
        node,
        node.type.schema.nodes.listing
      )

      if (listingNode) {
        const { contents, languageKey } = listingNode.attrs

        if (contents && languageKey) {
          const listing = this.document.createElement('fig')
          listing.setAttribute('specific-use', 'source')
          element.appendChild(listing)

          const code = this.document.createElement('code')
          code.setAttribute('executable', 'true')
          code.setAttribute('language', languageKey)
          code.textContent = contents
          listing.appendChild(code)

          // TODO: something more appropriate than "caption"?
          const caption = this.document.createElement('caption')
          listing.appendChild(caption)

          // TODO: real data
          const attachments: Array<{ id: string; type: string }> = []

          for (const attachment of attachments) {
            const p = this.document.createElement('p')
            caption.appendChild(p)

            const filename = generateAttachmentFilename(
              `${listingNode.attrs.id}:${attachment.id}`,
              attachment.type
            )

            const supp = this.document.createElement('supplementary-material')

            supp.setAttributeNS(
              XLINK_NAMESPACE,
              'xlink:href',
              `suppl/${filename}`
            )

            const [mimeType, mimeSubType] = attachment.type.split('/')

            if (mimeType) {
              supp.setAttribute('mimetype', mimeType)

              if (mimeSubType) {
                supp.setAttribute('mime-subtype', mimeSubType)
              }
            }

            // TODO: might need title, length, etc for data files

            p.appendChild(supp)
          }
        }
      }
    }
  }

  protected serializeFragment = (fragment: ManuscriptFragment) =>
    this.serializer.serializeFragment(fragment, {
      document: this.document,
    })

  protected serializeNode = (node: ManuscriptNode) =>
    this.serializer.serializeNode(node, {
      document: this.document,
    })

  private validateContributor = (contributor: Contributor) => {
    if (!contributor.bibliographicName) {
      throw new Error(`${contributor._id} has no bibliographicName`)
    }

    const { family, given } = contributor.bibliographicName

    if (!family && !given) {
      throw new Error(`${contributor._id} has neither family nor given name`)
    }
  }

  private buildContributors = (articleMeta: Node) => {
    const contributors = this.models.filter(isContributor)

    const authorContributors = contributors
      .filter((contributor) => contributor.role === 'author')
      .sort(sortContributors)

    const affiliationLabels = new Map<string, number>()
    const creatAffiliationLabel = (rid: string) => {
      let label = affiliationLabels.get(rid)
      if (!label) {
        label = affiliationLabels.size + 1
        affiliationLabels.set(rid, label)
      }
      const sup = this.document.createElement('sup')
      sup.textContent = String(label)
      return sup
    }
    const createFootNotesLabels = (content: string) => {
      const sup = this.document.createElement('sup')
      sup.textContent = String(content)
      return sup
    }
    if (authorContributors.length) {
      const contribGroup = this.document.createElement('contrib-group')
      contribGroup.setAttribute('content-type', 'authors')
      articleMeta.appendChild(contribGroup)
      authorContributors.forEach((contributor) => {
        try {
          this.validateContributor(contributor)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          warn(error.message)
          return
        }

        const contrib = this.document.createElement('contrib')
        contrib.setAttribute('contrib-type', 'author')
        contrib.setAttribute('id', normalizeID(contributor._id))

        if (contributor.isCorresponding) {
          contrib.setAttribute('corresp', 'yes')
        }

        if (contributor.ORCIDIdentifier) {
          const identifier = this.document.createElement('contrib-id')
          identifier.setAttribute('contrib-id-type', 'orcid')
          identifier.textContent = contributor.ORCIDIdentifier
          contrib.appendChild(identifier)
        }

        const name = this.buildContributorName(contributor)
        contrib.appendChild(name)

        if (contributor.email) {
          const email = this.document.createElement('email')
          email.textContent = contributor.email
          contrib.appendChild(email)
        }

        if (contributor.roles) {
          contributor.roles.forEach((rid) => {
            const contributorRole = this.modelMap.get(rid) as
              | ContributorRole
              | undefined

            if (contributorRole) {
              const role = this.document.createElement('role')

              const attributes = chooseRoleVocabAttributes(contributorRole)

              for (const [key, value] of Object.entries(attributes)) {
                role.setAttribute(key, value)
              }

              role.textContent = contributorRole.name

              contrib.appendChild(role)
            }
          })
        }
        if (contributor.affiliations) {
          contributor.affiliations.forEach((rid) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'aff')
            xref.setAttribute('rid', normalizeID(rid))
            xref.appendChild(creatAffiliationLabel(rid))
            contrib.appendChild(xref)
          })
        }

        if (contributor.footnote) {
          contributor.footnote.map((note) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'fn')
            xref.setAttribute('rid', normalizeID(note.noteID))
            xref.appendChild(createFootNotesLabels(note.noteLabel))
            contrib.appendChild(xref)
          })
        }
        if (contributor.corresp) {
          contributor.corresp.map((corresp) => {
            const xref = this.document.createElement('xref')
            xref.setAttribute('ref-type', 'corresp')
            xref.setAttribute('rid', normalizeID(corresp.correspID))
            xref.appendChild(createFootNotesLabels(corresp.correspLabel))
            contrib.appendChild(xref)
          })
        }
        contribGroup.appendChild(contrib)
      })

      const otherContributors = contributors
        .filter((contributor) => contributor.role !== 'author')
        .sort(sortContributors)

      if (otherContributors.length) {
        const contribGroup = this.document.createElement('contrib-group')
        articleMeta.appendChild(contribGroup)

        otherContributors.forEach((contributor) => {
          try {
            this.validateContributor(contributor)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            warn(error.message)
            return
          }

          const contrib = this.document.createElement('contrib')
          // contrib.setAttribute('contrib-type', 'other')
          contrib.setAttribute('id', normalizeID(contributor._id))

          const name = this.buildContributorName(contributor)
          contrib.appendChild(name)

          if (contributor.email) {
            const email = this.document.createElement('email')
            email.textContent = contributor.email
            contrib.appendChild(email)
          }

          if (contributor.roles) {
            contributor.roles.forEach((rid) => {
              const contributorRole = this.modelMap.get(rid) as
                | ContributorRole
                | undefined

              if (contributorRole) {
                const role = this.document.createElement('role')

                const attributes = chooseRoleVocabAttributes(contributorRole)

                for (const [key, value] of Object.entries(attributes)) {
                  role.setAttribute(key, value)
                }

                role.textContent = contributorRole.name

                contrib.appendChild(role)
              }
            })
          }

          if (contributor.affiliations) {
            contributor.affiliations.forEach((rid) => {
              const xref = this.document.createElement('xref')
              xref.setAttribute('ref-type', 'aff')
              xref.setAttribute('rid', normalizeID(rid))
              xref.appendChild(creatAffiliationLabel(rid))
              contrib.appendChild(xref)
            })
          }
          if (contributor.footnote) {
            contributor.footnote.map((note) => {
              const xref = this.document.createElement('xref')
              xref.setAttribute('ref-type', 'fn')
              xref.setAttribute('rid', normalizeID(note.noteID))
              xref.appendChild(createFootNotesLabels(note.noteLabel))
              contrib.appendChild(xref)
            })
          }

          contribGroup.appendChild(contrib)
        })
      }

      const affiliationRIDs: string[] = []

      const sortedContributors = [...authorContributors, ...otherContributors]

      for (const contributor of sortedContributors) {
        if (contributor.affiliations) {
          affiliationRIDs.push(...contributor.affiliations)
        }
      }

      const affiliations = this.models.filter(
        hasObjectType<Affiliation>(ObjectTypes.Affiliation)
      )

      if (affiliations) {
        const usedAffiliations = affiliations.filter((affiliation) =>
          affiliationRIDs.includes(affiliation._id)
        )

        usedAffiliations.sort(
          (a, b) =>
            affiliationRIDs.indexOf(a._id) - affiliationRIDs.indexOf(b._id)
        )

        usedAffiliations.forEach((affiliation) => {
          const aff = this.document.createElement('aff')
          aff.setAttribute('id', normalizeID(affiliation._id))
          contribGroup.appendChild(aff)

          if (affiliation.department) {
            const department = this.document.createElement('institution')
            department.setAttribute('content-type', 'dept')
            department.textContent = affiliation.department
            aff.appendChild(department)
          }

          if (affiliation.institution) {
            const institution = this.document.createElement('institution')
            institution.textContent = affiliation.institution
            aff.appendChild(institution)
          }

          if (affiliation.addressLine1) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.addressLine1
            aff.appendChild(addressLine)
          }

          if (affiliation.addressLine2) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.addressLine2
            aff.appendChild(addressLine)
          }

          if (affiliation.addressLine3) {
            const addressLine = this.document.createElement('addr-line')
            addressLine.textContent = affiliation.addressLine3
            aff.appendChild(addressLine)
          }

          if (affiliation.city) {
            const city = this.document.createElement('city')
            city.textContent = affiliation.city
            aff.appendChild(city)
          }

          if (affiliation.country) {
            const country = this.document.createElement('country')
            country.textContent = affiliation.country
            aff.appendChild(country)
          }

          if (affiliation.email) {
            const email = this.document.createElement('email')
            email.setAttributeNS(
              XLINK_NAMESPACE,
              'href',
              affiliation.email.href ?? ''
            )
            email.textContent = affiliation.email.text ?? ''
            aff.appendChild(email)
          }
          const labelNumber = affiliationLabels.get(affiliation._id)
          if (labelNumber) {
            const label = this.document.createElement('label')
            label.textContent = String(labelNumber)
            aff.appendChild(label)
          }
        })
      }
      const noteIDs: string[] = []
      for (const contributor of [...authorContributors, ...otherContributors]) {
        if (contributor.footnote) {
          const ids = contributor.footnote.map((note) => {
            return note.noteID
          })
          noteIDs.push(...ids)
        }
        if (contributor.corresp) {
          const ids = contributor.corresp.map((corresp) => {
            return corresp.correspID
          })
          noteIDs.push(...ids)
        }
      }
      const footnotes: Footnote[] = []
      footnotes.push(
        ...this.models.filter(hasObjectType<Footnote>(ObjectTypes.Footnote))
      )

      const correspodings: Corresponding[] = []
      correspodings.push(
        ...this.models.filter(
          hasObjectType<Corresponding>(ObjectTypes.Corresponding)
        )
      )

      if (footnotes || correspodings) {
        const authorNotesEl = this.document.createElement('author-notes')
        const usedFootnotes = footnotes.filter((footnote) => {
          return noteIDs.includes(footnote._id)
        })
        const usedCorrespodings = correspodings.filter((corresp) => {
          return noteIDs.includes(corresp._id)
        })
        usedFootnotes.forEach((footnote) => {
          const authorFootNote = this.document.createElement('fn')
          authorFootNote.setAttribute('id', normalizeID(footnote._id))
          authorFootNote.innerHTML = footnote.contents
          authorNotesEl.appendChild(authorFootNote)
        })
        usedCorrespodings.forEach((corresponding) => {
          const correspondingEl = this.document.createElement('corresp')
          correspondingEl.setAttribute('id', normalizeID(corresponding._id))
          if (corresponding.label) {
            const labelEl = this.document.createElement('label')
            labelEl.textContent = corresponding.label
            correspondingEl.appendChild(labelEl)
          }
          correspondingEl.append(corresponding.contents)
          authorNotesEl.appendChild(correspondingEl)
        })
        if (authorNotesEl.childNodes.length > 0) {
          articleMeta.insertBefore(authorNotesEl, contribGroup.nextSibling)
        }
      }
    }

    // const authorNotes = this.document.createElement('author-notes')
    // articleMeta.appendChild(authorNotes)

    // corresp
    // TODO: make this editable as plain text instead, with email addresses hyperlinked
    // const correspondingAuthor = authorContributors.find(
    //   (contributor) => contributor.isCorresponding
    // )
    //
    // if (correspondingAuthor) {
    //   const name = [
    //     correspondingAuthor.bibliographicName.given,
    //     correspondingAuthor.bibliographicName.family,
    //   ]
    //     .filter(Boolean)
    //     .join(' ')
    //
    //   const corresp = this.document.createElement('corresp')
    //   corresp.textContent = `Corresponding author: ${name}`
    //   authorNotes.appendChild(corresp)
    //
    //   if (correspondingAuthor.email) {
    //     const email = this.document.createElement('email')
    //     email.setAttributeNS(
    //       XLINK_NAMESPACE,
    //       'href',
    //       `mailto:${correspondingAuthor.email}`
    //     )
    //     email.textContent = correspondingAuthor.email
    //     corresp.appendChild(this.document.createTextNode(' '))
    //     corresp.appendChild(email)
    //   }
    // }
  }

  private buildKeywords(articleMeta: Node) {
    const keywords = [...this.modelMap.values()].filter(
      (model) => model.objectType === ObjectTypes.Keyword
    ) as Keyword[]

    const keywordGroups = new Map<string, Array<Keyword>>()

    keywords.forEach((keyword) => {
      const containedGroup = keyword.containedGroup || ''
      const group = keywordGroups.get(containedGroup)
      if (group) {
        group.push(keyword)
      } else {
        keywordGroups.set(containedGroup, [keyword])
      }
    })

    for (const [groupID, keywords] of keywordGroups) {
      const keywordGroup = (this.modelMap.get(groupID) || {}) as KeywordGroup
      const kwdGroup = this.document.createElement('kwd-group')

      if (keywordGroup.type) {
        kwdGroup.setAttribute('kwd-group-type', keywordGroup.type)
      }
      if (keywordGroup.label) {
        const label = this.document.createElement('label')
        label.textContent = keywordGroup.label
        kwdGroup.appendChild(label)
      }
      if (keywordGroup.title) {
        const title = this.document.createElement('title')
        title.textContent = keywordGroup.title
        kwdGroup.appendChild(title)
      }

      articleMeta.appendChild(kwdGroup)

      for (const keyword of keywords) {
        const kwd = this.document.createElement('kwd')
        kwd.textContent = keyword.name
        kwdGroup.appendChild(kwd)
      }
      articleMeta.appendChild(kwdGroup)
    }
  }

  private fixBody = (body: Element, fragment: ManuscriptFragment) => {
    fragment.descendants((node) => {
      if (node.attrs.id) {
        // remove suppressed titles
        if (node.attrs.titleSuppressed) {
          const title = body.querySelector(
            `#${normalizeID(node.attrs.id)} > title`
          )

          if (title && title.parentNode) {
            title.parentNode.removeChild(title)
          }
        }

        // remove suppressed captions and labels
        if (node.attrs.suppressCaption) {
          // TODO: need to query deeper?
          const caption = body.querySelector(
            `#${normalizeID(node.attrs.id)} > caption`
          )

          if (caption) {
            caption.remove()
          }

          const label = body.querySelector(
            `#${normalizeID(node.attrs.id)} > label`
          )

          if (label) {
            label.remove()
          }
        }

        // move captions to the top of tables
        if (isNodeType<TableElementNode>(node, 'table_element')) {
          const tableElement = body.querySelector(
            `#${normalizeID(node.attrs.id)}`
          )

          if (tableElement) {
            for (const childNode of tableElement.childNodes) {
              switch (childNode.nodeName) {
                case 'caption': {
                  if (node.attrs.suppressCaption) {
                    tableElement.removeChild(childNode)
                  } else {
                    const label = tableElement.querySelector('label')

                    tableElement.insertBefore(
                      childNode,
                      label ? label.nextSibling : tableElement.firstChild
                    )
                  }
                  break
                }

                case 'table': {
                  this.fixTable(childNode, node)
                  break
                }
              }
            }
          }
        }
      }
    })
  }

  private changeTag = (node: Element, tag: string) => {
    const clone = this.document.createElement(tag)
    for (const attr of node.attributes) {
      clone.setAttributeNS(null, attr.name, attr.value)
    }
    while (node.firstChild) {
      clone.appendChild(node.firstChild)
    }
    node.replaceWith(clone)
    return clone
  }

  private fixTable = (table: ChildNode, node: ManuscriptNode) => {
    let tbody: Element | undefined

    Array.from(table.childNodes).forEach((child) => {
      if (child instanceof Element && child.tagName.toLowerCase() === 'tbody') {
        tbody = child
      }
    })

    if (!tbody) {
      return
    }

    const tbodyRows = Array.from(tbody.childNodes)
    const thead = this.document.createElement('thead')
    const tfoot = this.document.createElement('tfoot')

    tbodyRows.forEach((row, i) => {
      const isRow = row instanceof Element && row.tagName.toLowerCase() === 'tr'
      if (isRow) {
        // we assume that <th scope="col | colgroup"> always belongs to <thead>
        const headerCell = (row as Element).querySelector(
          'th[scope="col"], th[scope="colgroup"]'
        )
        if (i === 0 || headerCell) {
          tbody?.removeChild(row)
          if (!node.attrs.suppressHeader) {
            const tableCells = (row as Element).querySelectorAll('td')
            for (const td of tableCells) {
              // for backwards compatibility since older docs use tds for header cells
              this.changeTag(td, 'th')
            }
            thead.appendChild(row)
          }
        } else if (i === tbodyRows.length - 1) {
          tbody?.removeChild(row)
          if (!node.attrs.suppressFooter) {
            tfoot.appendChild(row)
          }
        }
      }
    })

    if (thead.hasChildNodes()) {
      table.insertBefore(thead, tbody as Element)
    }

    if (tfoot.hasChildNodes()) {
      table.insertBefore(tfoot, tbody as Element)
    }
  }
  private unwrapBody = (body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="body"]')
    if (!container) {
      return
    }
    const sections = container.querySelectorAll(':scope > sec')
    sections.forEach((section) => {
      body.appendChild(section.cloneNode(true))
    })
    body.removeChild(container)
  }
  private removeBackContainer = (body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="backmatter"]')
    if (!container) {
      return
    }
    const isContainerEmpty = container.children.length === 0
    if (!isContainerEmpty) {
      warn('Backmatter section is not empty.')
    }
    body.removeChild(container)
  }
  private moveAbstracts = (front: HTMLElement, body: HTMLElement) => {
    const container = body.querySelector(':scope > sec[sec-type="abstracts"]')
    let abstractSections
    if (container) {
      abstractSections = Array.from(container.querySelectorAll(':scope > sec'))
    } else {
      abstractSections = Array.from(
        body.querySelectorAll(':scope > sec')
      ).filter((section) => {
        const sectionType = section.getAttribute('sec-type')

        if (
          sectionType === 'abstract' ||
          sectionType === 'abstract-teaser' ||
          sectionType === 'abstract-graphical'
        ) {
          return true
        }

        const sectionTitle = section.querySelector(':scope > title')

        if (!sectionTitle) {
          return false
        }

        return sectionTitle.textContent === 'Abstract'
      })
    }
    if (abstractSections.length) {
      for (const abstractSection of abstractSections) {
        const abstractNode = this.document.createElement('abstract')

        // TODO: ensure that abstract section schema is valid
        for (const node of abstractSection.childNodes) {
          if (node.nodeName !== 'title') {
            abstractNode.appendChild(node.cloneNode(true))
          }
        }

        const sectionType = abstractSection.getAttribute('sec-type')

        if (sectionType && sectionType !== 'abstract') {
          const [, abstractType] = sectionType.split('-', 2)
          abstractNode.setAttribute('abstract-type', abstractType)
        }

        abstractSection.remove()

        const articleMeta = front.querySelector(':scope > article-meta')

        if (articleMeta) {
          insertAbstractNode(articleMeta, abstractNode)
        }
      }
    }
    if (container) {
      body.removeChild(container)
    }
  }

  private moveSectionsToBack = (back: HTMLElement, body: HTMLElement) => {
    const availabilitySection = body.querySelector(
      'sec[sec-type="availability"]'
    )

    if (availabilitySection) {
      back.insertBefore(availabilitySection, back.firstChild)
    }

    const section = body.querySelector('sec[sec-type="acknowledgments"]')

    if (section) {
      const ack = this.document.createElement('ack')

      while (section.firstChild) {
        ack.appendChild(section.firstChild)
      }

      if (section.parentNode) {
        section.parentNode.removeChild(section)
      }

      back.insertBefore(ack, back.firstChild)
    }
    const appendicesSections = body.querySelectorAll(
      'sec[sec-type="appendices"]'
    )

    if (appendicesSections) {
      const appGroup = this.document.createElement('app-group')
      appendicesSections.forEach((section) => {
        if (section.parentNode) {
          section.parentNode.removeChild(section)
        }
        const app = this.document.createElement('app')
        app.appendChild(section)
        appGroup.appendChild(app)
      })
      back.insertBefore(appGroup, back.firstChild)
    }

    const footNotes = []

    const footnoteCategories = [
      'con',
      'conflict',
      'deceased',
      'equal',
      'present-address',
      'presented-at',
      'previously-at',
      'supplementary-material',
      'supported-by',
      'financial-disclosure',
      'ethics-statement',
      'competing-interests',
    ]

    const sections = body.querySelectorAll('sec')
    for (const currentSection of sections) {
      const currentSectionType = currentSection.getAttribute('sec-type')
      if (
        currentSectionType &&
        footnoteCategories.indexOf(currentSectionType) >= 0
      ) {
        footNotes.push(
          this.sectionToFootnote(currentSection, currentSectionType)
        )
      }
    }

    if (footNotes.length > 0) {
      const fnGroup = this.document.createElement('fn-group')
      fnGroup.append(...footNotes)
      back.append(fnGroup)
    }
  }

  sectionToFootnote = (section: Element, fnType: string) => {
    const footNote = this.document.createElement('fn')
    footNote.setAttribute('fn-type', fnType)
    const title = section.querySelector('title')
    if (title) {
      const footNoteTitle = this.document.createElement('p')
      footNoteTitle.setAttribute('content-type', 'fn-title')
      footNoteTitle.textContent = title.textContent
      section.removeChild(title)
      footNote.append(footNoteTitle)
    }
    footNote.append(...section.children)
    if (section.parentNode) {
      section.parentNode.removeChild(section)
    }
    return footNote
  }
  private moveFloatsGroup = (body: HTMLElement, article: HTMLElement) => {
    const floatsGroup = this.document.createElement('floats-group')
    const section = body.querySelector('sec[sec-type="floating-element"]')
    if (section) {
      floatsGroup.append(...section.children)

      if (section?.parentNode) {
        section.parentNode.removeChild(section)
      }
      article.appendChild(floatsGroup)
    }
  }

  private buildContributorName = (contributor: Contributor) => {
    const name = this.document.createElement('name')

    if (contributor.bibliographicName.family) {
      const surname = this.document.createElement('surname')
      surname.textContent = contributor.bibliographicName.family
      name.appendChild(surname)
    }

    if (contributor.bibliographicName.given) {
      const givenNames = this.document.createElement('given-names')
      givenNames.textContent = contributor.bibliographicName.given
      name.appendChild(givenNames)
    }

    return name
  }

  private moveCoiStatementToAuthorNotes(back: HTMLElement, front: HTMLElement) {
    const fnGroups = back.querySelectorAll('fn-group')
    fnGroups.forEach((fnGroup) => {
      if (fnGroup) {
        const coiStatement = fnGroup.querySelector(
          'fn[fn-type="competing-interests"]'
        )
        if (coiStatement) {
          const authorNotes = this.document.createElement('author-notes')
          authorNotes.append(coiStatement)
          const articleMeta = front.querySelector('article-meta')
          if (articleMeta) {
            const authorNoteEl = articleMeta.querySelector('author-notes')
            if (authorNoteEl) {
              authorNoteEl.append(...authorNotes.childNodes)
            } else {
              const appendableSelectors = [
                'contrib-group',
                'title-group',
                'article-id',
              ]
              const appendable = [
                ...(articleMeta as HTMLElement).querySelectorAll(
                  appendableSelectors.join(', ')
                ),
              ]
              for (let i = 0; i < appendableSelectors.length; i++) {
                const sel = appendableSelectors[i]
                const match = appendable.find((el) => el.matches(sel))
                if (match) {
                  articleMeta.insertBefore(authorNotes, match.nextSibling)
                  break
                }
              }
            }
          }
        }
      }
    })
  }

  private updateFootnoteTypes(front: HTMLElement, body: HTMLElement) {
    const footnotes: Element[] = [...front.querySelectorAll('fn').values()]
    footnotes.push(...body.querySelectorAll('fn'))
    footnotes.forEach((fn) => {
      const fnType = fn.getAttribute('fn-type')
      if (fnType) {
        fn.setAttribute('fn-type', chooseJatsFnType(fnType))
      }
    })
  }
}
