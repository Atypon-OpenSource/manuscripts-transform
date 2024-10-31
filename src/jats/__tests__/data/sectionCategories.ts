/*!
 * © 2024 Atypon Systems LLC
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

import { SectionCategory, SectionGroup } from '../../../schema'

export const sectionCategories: SectionCategory[] = [
  {
    id: 'abbreviations',
    titles: ['Abbreviations'],
    synonyms: ['list of abbreviations', 'abbreviations'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'acknowledgements',
    synonyms: ['acknowledgements', 'acknowledgments'],
    titles: ['Acknowledgements'],
    group: SectionGroup.Backmatter,
    isUnique: true,
  },
  {
    id: 'appendices',
    titles: ['Appendices'],
    synonyms: ['appendices'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'author-contributions',
    titles: ['Author contributions'],
    synonyms: ['author contributions', 'authorContributions'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'availability',
    titles: ['Availability'],
    synonyms: ['availability', 'data-availability', 'data availability'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'bibliography',
    titles: ['Bibliography'],
    synonyms: ['bibliography', 'references'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'coi-statement',
    synonyms: [
      'coi-statement',
      'competing-interests',
      'conflict',
      'conflict of interest',
      'competing interests',
    ],
    titles: ['COI Statement', 'Competing Interests'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'con',
    synonyms: ['con'],
    titles: ['Contributed-by information'],
    group: SectionGroup.Backmatter,
    isUnique: true,
  },
  {
    id: 'conclusions',
    synonyms: ['conclusions'],
    titles: ['Conclusions'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'deceased',
    titles: ['Deceased'],
    synonyms: ['deceased'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'discussion',
    synonyms: ['discussion'],
    titles: ['Discussion'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'equal',
    titles: ['Equal'],
    synonyms: ['equal'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'ethics-statement',
    synonyms: ['ethics-statement'],
    titles: ['Ethics Statement'],
    group: SectionGroup.Backmatter,
    isUnique: false,
  },
  {
    id: 'financial-disclosure',
    synonyms: ['financial-disclosure', 'funding information'],
    titles: ['Financial Disclosure'],
    group: SectionGroup.Backmatter,
    isUnique: true,
  },
  {
    id: 'abstract-teaser',
    titles: ['Abstract Teaser'],
    synonyms: ['abstract-teaser'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'floating-element',
    titles: ['Floating Element'],
    synonyms: ['floating-element'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'intro',
    synonyms: ['intro', 'introduction'],
    titles: ['Introduction'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'present-address',
    titles: ['Present Address'],
    synonyms: ['present-address'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'presented-at',
    titles: ['Presented at'],
    synonyms: ['presented-at'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'previously-at',
    titles: ['Previously at'],
    synonyms: ['previously-at'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'results',
    synonyms: ['results'],
    titles: ['Results'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'review',
    titles: ['Review'],
    synonyms: [],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'section',
    titles: ['Section'],
    synonyms: [],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'subsection',
    titles: ['Subsection'],
    synonyms: ['subsection'],
    group: SectionGroup.Body,
    isUnique: false,
  },
  {
    id: 'supplementary-material',
    synonyms: ['supplementary-material'],
    titles: ['Supplementary Material'],
    group: SectionGroup.Backmatter,
    isUnique: true,
  },
  {
    id: 'supported-by',
    synonyms: ['supported-by'],
    titles: ['Supported By'],
    group: SectionGroup.Backmatter,
    isUnique: true,
  },
]
