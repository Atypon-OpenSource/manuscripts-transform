/*!
 * © 2026 Atypon Systems LLC
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
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types/*'],
      reporter: ['text-summary'],
    },
    setupFiles: ['./src/tests.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    snapshotFormat: {
      printBasicPrototype: true,
      escapeString: true,
    },
    env: {
      XML_CATALOG_FILES: './node_modules/@jats4r/dtds/schema/catalog.xml',
    },
  },
})
