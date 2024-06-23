"use strict";
exports.__esModule = true;
exports.getVersion = void 0;
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
// version file is created by prebuild script and gitignored which means you wont be able to find it in the source
var version_1 = require("./version");
function getVersion() {
    return version_1.VERSION;
}
exports.getVersion = getVersion;
