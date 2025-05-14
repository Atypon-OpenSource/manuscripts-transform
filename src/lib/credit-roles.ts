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

export const enum CreditVocabTerm {
  Conceptualization = 'Conceptualization',
  DataCuration = 'Data curation',
  FormalAnalysis = 'Formal analysis',
  FundingAcquisition = 'Funding acquisition',
  Investigation = 'Investigation',
  Methodology = 'Methodology',
  ProjectAdministration = 'ProjectAdministration',
  Resources = 'Resources',
  Software = 'Software',
  Supervision = 'Supervision',
  Validation = 'Validation',
  Visualization = 'Visualization',
  WritingOriginalDraft = 'Writing – original draft',
  WritingReviewEditing = 'Writing – review & editing',
}

export const CRediTRoleUrls = new Map([
  [
    CreditVocabTerm.Conceptualization,
    'https://credit.niso.org/contributor-roles/conceptualization/',
  ],
  [
    CreditVocabTerm.DataCuration,
    'https://credit.niso.org/contributor-roles/data-curation/',
  ],
  [
    CreditVocabTerm.FormalAnalysis,
    'https://credit.niso.org/contributor-roles/formal-analysis/',
  ],
  [
    CreditVocabTerm.FundingAcquisition,
    'https://credit.niso.org/contributor-roles/funding-acquisition/',
  ],
  [
    CreditVocabTerm.Investigation,
    'https://credit.niso.org/contributor-roles/investigation/',
  ],
  [
    CreditVocabTerm.Methodology,
    'https://credit.niso.org/contributor-roles/methodology/',
  ],
  [
    CreditVocabTerm.ProjectAdministration,
    'https://credit.niso.org/contributor-roles/project-administration/',
  ],
  [
    CreditVocabTerm.Resources,
    'https://credit.niso.org/contributor-roles/resources/',
  ],
  [
    CreditVocabTerm.Software,
    'https://credit.niso.org/contributor-roles/software/',
  ],
  [
    CreditVocabTerm.Supervision,
    'https://credit.niso.org/contributor-roles/supervision/',
  ],
  [
    CreditVocabTerm.Validation,
    'https://credit.niso.org/contributor-roles/validation/',
  ],
  [
    CreditVocabTerm.Visualization,
    'https://credit.niso.org/contributor-roles/visualization/',
  ],
  [
    CreditVocabTerm.WritingOriginalDraft,
    'https://credit.niso.org/contributor-roles/writing-original-draft/',
  ],
  [
    CreditVocabTerm.WritingReviewEditing,
    'https://credit.niso.org/contributor-roles/writing-review-editing/',
  ],
])
