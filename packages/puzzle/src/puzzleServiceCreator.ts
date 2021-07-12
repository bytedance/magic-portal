/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  MagicPortalElement,
  IPortalManifest,
  portalElementCreator,
  IDefaultPortalProps,
  customElementCompatibility,
} from '@magic-microservices/portal';
import { iframeCreator, IIframeCreatorParams } from './iframeCreator';

interface IPuzzleModeOptions {
  serviceMode?: 'auto' | 'wc' | 'iframe';
}

export type IPuzzleServiceItem<T extends IDefaultPortalProps = IDefaultPortalProps> =
  IPuzzleModeOptions & IIframeCreatorParams & T;

export type { IPortalManifest };

export type PuzzleServiceInstance = MagicPortalElement | HTMLIFrameElement;

export async function puzzle<T extends IDefaultPortalProps = IDefaultPortalProps>(
  serviceOptions: IPuzzleServiceItem<T>,
): Promise<PuzzleServiceInstance> {
  const { serviceMode = 'auto' } = serviceOptions;
  // 用户在不兼容 web components 的浏览器下强制使用 wc mode
  if (!customElementCompatibility && serviceMode === 'wc') {
    throw new Error(
      'Browser do not support web components, please change serviceMode options to `auto` or `iframe`',
    );
  }
  // 判断 magic 核心能力兼容性
  const webComponentsMode =
    (serviceMode === 'auto' && customElementCompatibility) || serviceMode === 'wc';
  // 生成 service 实例
  const serviceIns = await (webComponentsMode
    ? portalElementCreator<T>(serviceOptions)
    : iframeCreator(serviceOptions));
  return serviceIns;
}
