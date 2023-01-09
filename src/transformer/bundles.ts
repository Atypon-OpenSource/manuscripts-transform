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
import { Bundle } from '@manuscripts/json-schema'

import { fromPrototype } from './manuscript-dependencies'

const findBundleByURL = (
  url: string,
  bundles: Map<string, Bundle>
): Bundle | undefined => {
  for (const bundle of bundles.values()) {
    if (bundle.csl && bundle.csl['self-URL'] === url) {
      return bundle
    }
  }
}

export const createParentBundle = (
  bundle: Bundle,
  bundles: Map<string, Bundle>
): Bundle | undefined => {
  if (bundle.csl) {
    const parentURL = bundle.csl['independent-parent-URL']

    if (parentURL) {
      const parentBundle = findBundleByURL(parentURL, bundles)

      if (!parentBundle) {
        throw new Error(`Bundle with URL not found: ${parentURL} `)
      }

      return fromPrototype<Bundle>(parentBundle)
    }
  }
}

export const createNewBundle = (
  bundleID: string,
  bundles: Map<string, Bundle>
): Bundle => {
  const bundle = bundles.get(bundleID)

  if (!bundle) {
    throw new Error(`Bundle not found: ${bundleID}`)
  }

  return fromPrototype<Bundle>(bundle)
}
