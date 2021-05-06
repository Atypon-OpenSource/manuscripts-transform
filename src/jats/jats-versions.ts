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

interface VersionIds {
  publicId: string
  systemId: string
}

export type Version = '1.1' | '1.2d1' | '1.2'

const versions: { [key in Version]: VersionIds } = {
  '1.1': {
    publicId:
      '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.1 20151215//EN',
    systemId:
      'http://jats.nlm.nih.gov/archiving/1.1/JATS-archive-oasis-article1-mathml3.dtd',
  },
  '1.2d1': {
    publicId:
      '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2d1 20170631//EN',
    systemId:
      'http://jats.nlm.nih.gov/archiving/1.2d1/JATS-archive-oasis-article1-mathml3.dtd',
  },
  '1.2': {
    publicId:
      '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2 20190208//EN',
    systemId:
      'http://jats.nlm.nih.gov/archiving/1.2/JATS-archive-oasis-article1-mathml3.dtd',
  },
}

export const supportedVersions = (): Version[] =>
  Object.keys(versions) as Version[]

export const selectVersionIds = (version: Version): VersionIds => {
  if (!(version in versions)) {
    throw new Error(`Unknown version ${version}`)
  }

  return versions[version]
}
