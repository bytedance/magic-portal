/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function defaultFetch(url: string): Promise<string> {
  return window.fetch(url).then((res) => res.text());
}
