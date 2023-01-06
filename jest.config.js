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
process.env.XML_CATALOG_FILES = './node_modules/@jats4r/dtds/schema/catalog.xml'

module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/types/*'],
  coverageReporters: ['text-summary'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  setupFiles: ['./src/tests.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  testRegex: '__tests__.*\\.test\\.tsx?$',
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(lodash-es|@manuscripts)/)',
  ],
  testEnvironment: 'jsdom',
  snapshotFormat: {
    printBasicPrototype: true,
    escapeString: true,
  },
}
