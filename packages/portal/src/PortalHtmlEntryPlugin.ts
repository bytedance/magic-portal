/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  ICustomDOMMatcher,
  IPortalHtmlParserResult,
  portalHtmlParser,
} from '@magic-microservices/portal-utils';
import { Module, LifeCycle } from '@magic-microservices/magic';
import { IDefaultPortalProps, MagicPortalElement } from './portalRegister';
import { defaultFetch } from './utils/defaultFetch';
import { removeOriginFromUrl } from './utils/removeOriginFromUrl';

export const HTML_ENTRY_ATTRIBUTE_NAME = 'html' as const;

export interface IPortalHtmlEntryLoaderOptions {
  fetch?: (url: string) => Promise<string>;
  matchers?: ICustomDOMMatcher[];
}

export interface IPortalHtmlEntryLoaderResult {
  manifest: IPortalHtmlParserResult;
  initialPath: string;
}

export interface PortalElementWithHTMLEntryProps extends IDefaultPortalProps {
  [HTML_ENTRY_ATTRIBUTE_NAME]?: string;
}

export class PortalHtmlEntryPlugin {
  options: IPortalHtmlEntryLoaderOptions;

  constructor(
    options: IPortalHtmlEntryLoaderOptions = {} as IPortalHtmlEntryLoaderOptions,
  ) {
    this.options = options;
  }

  async getManifest(url: string) {
    const { fetch = defaultFetch, matchers } = this.options;
    const htmlContent = await fetch(url);
    return portalHtmlParser(htmlContent, matchers);
  }

  formateIntialPathFromHtmlEntry(props: PortalElementWithHTMLEntryProps, html: string) {
    if (props['history-isolation']) {
      props['initial-path'] = props['initial-path'] || removeOriginFromUrl(html);
    }
  }

  apply(lifeCycle: LifeCycle<PortalElementWithHTMLEntryProps>) {
    const { fetch } = this.options;
    lifeCycle.hooks.beforeOptionsInit.tap((lifeCycle) => {
      const rawModule = lifeCycle!.magicInput
        .module as Module<PortalElementWithHTMLEntryProps>;
      lifeCycle!.magicInput.module = {
        ...rawModule,
        mount: async (container, props, ...rest) => {
          if (props[HTML_ENTRY_ATTRIBUTE_NAME]) {
            props.manifest = await this.getManifest(props[HTML_ENTRY_ATTRIBUTE_NAME]!);
            props.fetch = props.fetch || fetch;
            this.formateIntialPathFromHtmlEntry(props, props[HTML_ENTRY_ATTRIBUTE_NAME]!);
          }
          await rawModule.mount(container, props, ...rest);
        },
        updated: async (attributeName, propsValue, _container, props, ...rest) => {
          let realAttributeName = attributeName;
          let realPropsValue = propsValue;
          if (attributeName === HTML_ENTRY_ATTRIBUTE_NAME) {
            realAttributeName = 'manifest';
            realPropsValue = await this.getManifest(propsValue as string);
            this.formateIntialPathFromHtmlEntry(props, props[HTML_ENTRY_ATTRIBUTE_NAME]!);
          }
          await rawModule.updated!(
            realAttributeName,
            realPropsValue,
            _container,
            props,
            ...rest,
          );
        },
      };
      lifeCycle!.magicInput.options.propTypes![HTML_ENTRY_ATTRIBUTE_NAME] = String;
    });
  }
}

export interface MagicPortalElementWithHTMLEntry
  extends MagicPortalElement,
    PortalElementWithHTMLEntryProps {}
