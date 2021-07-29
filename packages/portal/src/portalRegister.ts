/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import magic, { isModuleRegistered, MagicOptions } from '@magic-microservices/magic';
import {
  renderHtmlTagObjectsToFragment,
  getHash,
  IPortalHtmlParserResult,
} from '@magic-microservices/portal-utils';
import { Sandbox } from '@garfish/browser-vm';
import { Module } from '@garfish/browser-vm/dist/types';
import md5 from 'blueimp-md5';

import { EventEmitter, EventType } from './EventEmitter';
import { HistoryEventEmitters, HistoryEvents, historySandbox } from './history/sandbox';
import { defaultFetch } from './utils/defaultFetch';
import { PropTypesMap } from '@magic-microservices/magic/dist/src/lib/Heap';
import { LOADING_CONTAINER_ID, loadingStyleCss, loadingDom } from './const/loading';

export interface IPortalManifest extends IPortalHtmlParserResult {
  renderContent?: string; // for SSR
}

type ManifestType = string | IPortalManifest;

export interface IDefaultPortalProps {
  manifest?: ManifestType | Promise<ManifestType>;
  fetch?: (url: string) => Promise<string>;
  'initial-path'?: string;
  'history-isolation'?: boolean;
  'render-dom-id'?: string;
  overrides?: Record<string, unknown>;
}

export interface IPortalRegisterOptions<
  T extends IDefaultPortalProps = IDefaultPortalProps,
> {
  restMagicOptions?: MagicOptions<T>;
  plugins?: MagicOptions<T>['plugins'];
}

export interface MagicPortalElement
  extends HTMLElement,
    IDefaultPortalProps,
    EventEmitter {
  sandbox?: Sandbox;
  hostEventEmitter: EventEmitter;
  clientEventEmitter: EventEmitter;
  historyEventEmitters: HistoryEventEmitters;
}

export interface IPortalHost {
  shadowRoot: ShadowRoot;
  postMessage: EventEmitter['postMessage'];
  emitEvent: EventEmitter['emitEvent'];
  addEventListener: EventEmitter['addPortalEventListener'];
  removeEventListener: EventEmitter['removePortalEventListener'];
}

export interface IClientWindow extends Window {
  portalHost?: IPortalHost;
}

export const PORTAL_HTML_TAG = 'magic-portal';
const historyEvents = ['popstate', 'hashchange'] as const;
const rawElementAddEventListener = Element.prototype.addEventListener;
const rawElementRemoveEventListener = Element.prototype.removeEventListener;

interface IBuildPortalContentParams extends IDefaultPortalProps {
  container: Element;
  webcomponentsIns: MagicPortalElement;
}

async function buildPortalContent({
  container,
  manifest,
  fetch = defaultFetch,
  overrides,
  'history-isolation': historyIsolation,
  'initial-path': initialPath,
  'render-dom-id': renderDomId,
  webcomponentsIns,
}: IBuildPortalContentParams) {
  const { hostEventEmitter, clientEventEmitter, sandbox: oldSandbox } = webcomponentsIns;
  // clear sideEffect
  container.innerHTML = '';
  clientEventEmitter.emitEvent('beforeServiceUmount');
  clientEventEmitter.clean();
  oldSandbox?.clearEffects();

  // mock head
  const head = document.createElement('head');
  container.appendChild(head);
  // mock body
  const body = document.createElement('body');
  const bodyContent = document.createDocumentFragment();
  // create loading
  const loadingContainer = document.createElement('div');
  loadingContainer.setAttribute('id', LOADING_CONTAINER_ID);
  loadingContainer.style.position = 'absolute';
  loadingContainer.style.width = '100%';
  loadingContainer.style.height = '100%';
  const loadingStyleDom = document.createElement('style');
  loadingStyleDom.appendChild(document.createTextNode(loadingStyleCss));
  head.appendChild(loadingStyleDom);
  loadingContainer.innerHTML += loadingDom;
  // create render root
  const renderContainer = document.createElement('div');
  renderContainer.setAttribute('id', renderDomId || 'root');
  // generate body DOM
  bodyContent.appendChild(loadingContainer);
  bodyContent.appendChild(renderContainer);
  body.appendChild(bodyContent);
  container.appendChild(body);

  let manifestJson = (await manifest) as IPortalManifest;
  if (!manifestJson) {
    return;
  }
  if (typeof manifest === 'string') {
    manifestJson = JSON.parse(await fetch(manifest)) as IPortalManifest;
  }
  const { scripts, styles, renderContent } = manifestJson;
  const stylesDOMFragment = renderHtmlTagObjectsToFragment(styles);
  head.appendChild(stylesDOMFragment);
  // for SSR
  renderContent && (renderContainer.innerHTML = renderContent);

  let sandboxModulesOverrides: Module[] = [];
  if (historyIsolation) {
    const { location, history, History, historyEventEmitters } = historySandbox(
      initialPath || window.location.href,
    );
    webcomponentsIns.historyEventEmitters = historyEventEmitters;
    sandboxModulesOverrides = sandboxModulesOverrides.concat([
      () => ({
        override: {
          history,
          History,
        },
      }),
      () => ({
        override: {
          location,
        },
      }),
    ]);
  }

  // create sandbox
  const sandbox = new Sandbox({
    el: () => container,
    protectVariable: () => ['HTMLElement', 'EventTarget', 'Event'],
    useStrict: false,
    strictIsolation: true,
    namespace: md5(JSON.stringify(manifest)) + getHash(),
    modules: [
      // hack garfish sandbox error
      ...sandboxModulesOverrides,
      () => ({
        override: {
          module: {},
        },
      }),
      () => ({
        override: {
          portalHost: {
            shadowRoot: webcomponentsIns.shadowRoot,
            postMessage: hostEventEmitter.postMessage,
            emitEvent: hostEventEmitter.emitEvent,
            addEventListener: clientEventEmitter.addPortalEventListener,
            removeEventListener: clientEventEmitter.removePortalEventListener,
          },
        },
      }),
    ],
  });
  Object.keys(overrides || {}).forEach((key) => {
    if (sandbox.global && overrides) {
      // TODO: garfish will fix this type err
      sandbox.global[key as unknown as number] = overrides[key] as never;
    }
  });
  if (historyIsolation && sandbox.global) {
    const { historyEventEmitters } = webcomponentsIns;
    const rawAddEventListener = sandbox.global.addEventListener;
    const rawRemoveEventListener = sandbox.global.removeEventListener;
    const rawDispatchEvent = sandbox.global.dispatchEvent;
    sandbox.global.dispatchEvent = (event: Event): boolean => {
      if (event instanceof PopStateEvent || event instanceof HashChangeEvent) {
        historyEventEmitters.emit(
          event instanceof PopStateEvent ? 'popstate' : 'hashchange',
          event instanceof PopStateEvent
            ? new PopStateEvent('popstate')
            : new HashChangeEvent('hashchange'),
        );
        return true;
      }
      return rawDispatchEvent(event);
    };
    // 重写 historyIsolation 下的 popstate & hashchange 事件监听，保证和 location 表现一致
    sandbox.global.addEventListener = (
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ): void => {
      if (historyEvents.includes(type as HistoryEvents)) {
        return historyEventEmitters.on(type as HistoryEvents, listener);
      }
      return rawAddEventListener.call(sandbox.global, type, listener, options);
    };
    sandbox.global.removeEventListener = (
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ): void => {
      if (historyEvents.includes(type as HistoryEvents)) {
        return historyEventEmitters.off(type as HistoryEvents, listener);
      }
      return rawRemoveEventListener.call(sandbox.global, type, listener, options);
    };
  }
  webcomponentsIns.sandbox = sandbox;
  /**
   * proxy script tags
   */
  // 模拟浏览器串行加载执行所有 JS
  // TODO: 需要让过程更贴合浏览器实现，比如 async & defer & type="module"
  await scripts?.reduce(async (acc, script) => {
    await acc;
    let scriptContent = script.innerHTML;
    const scriptSrc = script.attributes?.src;
    if (scriptSrc) {
      scriptContent = await fetch(scriptSrc);
    }
    scriptContent && sandbox.execScript(scriptContent, {}, scriptSrc);
  }, Promise.resolve());
  // close loading
  loadingContainer.style.display = 'none';
}

export function isPortalRegister(): boolean {
  return isModuleRegistered(PORTAL_HTML_TAG);
}

export const customElementCompatibility =
  Object.prototype.toString.call(window.customElements) ===
  '[object CustomElementRegistry]';

export async function portalRegister<T extends IDefaultPortalProps = IDefaultPortalProps>(
  options: IPortalRegisterOptions<T> = {},
): Promise<void> {
  const { restMagicOptions, plugins } = options;

  if (!customElementCompatibility) {
    throw new Error('Browser not support web components');
  }

  // register a service component
  await magic<T>(
    PORTAL_HTML_TAG,
    {
      bootstrap: (webcomponentsIns: MagicPortalElement) => {
        // 父子通信能力
        const host = new EventEmitter();
        const client = new EventEmitter();
        webcomponentsIns.hostEventEmitter = host;
        webcomponentsIns.clientEventEmitter = client;
        webcomponentsIns.postMessage = client.postMessage;
        webcomponentsIns.emitEvent = client.emitEvent;
        webcomponentsIns.addPortalEventListener = host.addPortalEventListener;
        webcomponentsIns.removePortalEventListener = host.removePortalEventListener;
        webcomponentsIns.addEventListener = (
          type: EventType,
          listener: EventListener,
          ...args: unknown[]
        ) => {
          if (type === 'message') {
            return host.addPortalEventListener(type, listener);
          }
          return rawElementAddEventListener.call(
            webcomponentsIns,
            type,
            listener,
            ...args,
          );
        };
        webcomponentsIns.removeEventListener = (
          type: EventType,
          listener: EventListener,
          ...args: unknown[]
        ) => {
          if (type === 'message') {
            return host.removePortalEventListener(type, listener);
          }
          return rawElementRemoveEventListener.call(
            webcomponentsIns,
            type,
            listener,
            ...args,
          );
        };
      },
      mount: async (container, props, webcomponentsIns: MagicPortalElement) => {
        await buildPortalContent({
          ...props,
          container,
          webcomponentsIns,
        });
      },
      updated: async (attributeName, _propsValue, container, props, webcomponentsIns) => {
        if (attributeName === 'manifest' || attributeName === 'history-isolation') {
          await buildPortalContent({
            ...props,
            container,
            webcomponentsIns,
          });
        }
      },
      unmount: (webcomponentsIns: MagicPortalElement) => {
        const { hostEventEmitter, clientEventEmitter, sandbox } = webcomponentsIns;
        clientEventEmitter.emitEvent('beforeServiceUmount');
        clientEventEmitter.clean();
        hostEventEmitter.clean();
        sandbox?.clearEffects();
      },
    },
    {
      ...(restMagicOptions || {}),
      shadow: true,
      plugins: [...(restMagicOptions?.plugins || []), ...(plugins || [])],
      propTypes: {
        ...(restMagicOptions?.propTypes || ({} as PropTypesMap<T>)),
        manifest: Object,
        fetch: Function,
        overrides: Object,
        'initial-path': String,
        'history-isolation': Boolean,
      },
    },
  );
}

declare global {
  interface HTMLElementTagNameMap {
    [PORTAL_HTML_TAG]: MagicPortalElement;
  }
}
