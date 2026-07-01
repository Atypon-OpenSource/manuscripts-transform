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

import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import config from '@manuscripts/eslint-config'
import { defineConfig } from 'eslint/config'
import header from 'eslint-plugin-header'

header.rules.header.meta.schema = false

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
})

export default defineConfig([
  {
    ignores: [
      '**/dist/**',
      '**/__snapshots__/**',
      '**/__fixtures__/**',
      '**/src/version.ts',
      '**/*.json',
      '**/*.xml',
    ],
  },
  ...compat.config(config),
  ...compat.extends('plugin:diff/diff'),
  {
    rules: {
      // TypeScript already verifies module resolution during typecheck, and the
      // legacy eslint-plugin-import resolver cannot read modern "exports" maps
      // (e.g. uuid v14), so defer resolution checking to tsc.
      'import/no-unresolved': 'off',
      // This codebase intentionally uses `cond ? a() : b()` and `cond && a()`
      // as statements for their side effects.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
])
