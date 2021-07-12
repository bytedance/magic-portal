/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function removeOriginFromUrl(url: string): string {
  const anchor = document.createElement('a');
  anchor.href = url;
  return anchor.href.replace(anchor.origin, '');
}
