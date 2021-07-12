/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function getHash(): string {
  return Math.floor((1 + Math.random()) * 0x100000).toString(16);
}
