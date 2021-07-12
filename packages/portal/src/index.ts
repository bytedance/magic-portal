/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { portalRegister } from './portalRegister';

export { useProps } from '@magic-microservices/magic';
export * from './portalRegister';
export * from './portalCreator';
export * from './EventEmitter';
export * from './PortalHtmlEntryPlugin';

export default portalRegister;
