/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export interface IIframeCreatorParams {
  fallbackHTMLURL: string;
}

export function iframeCreator(serviceOptions: IIframeCreatorParams): HTMLIFrameElement {
  const { fallbackHTMLURL } = serviceOptions;
  const serviceIns = document.createElement('iframe');
  // TODO: 有一些熟悉需要了解 MMM 实现的背景
  serviceIns.setAttribute('src', fallbackHTMLURL);
  serviceIns.setAttribute('width', '100%');
  serviceIns.setAttribute('height', '100%');
  serviceIns.setAttribute('allow', 'fullscreen');
  // legacy attribute, added for IE support
  serviceIns.setAttribute('allowFullscreen', 'true');
  return serviceIns;
}
