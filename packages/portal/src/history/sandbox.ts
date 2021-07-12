/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function getUrlObj(url: string) {
  const a = document.createElement('a');
  a.href = url;
  return a;
}

export type Noop = () => void;

export class FackLocation implements Location {
  ancestorOrigins: DOMStringList = [window.location.origin] as unknown as DOMStringList;
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  assign: Noop;
  reload: Noop;
  replace: Noop;

  refreshLocation(url: string): void {
    const urlObj = new URL(url);
    this.hash = urlObj.hash;
    this.host = urlObj.host;
    this.hostname = urlObj.hostname;
    this.href = urlObj.href;
    this.origin = urlObj.origin;
    this.pathname = urlObj.pathname;
    this.port = urlObj.port;
    this.protocol = urlObj.protocol;
    this.search = urlObj.search;
  }

  constructor(initialUrl: string) {
    this.refreshLocation(initialUrl);
  }

  toString(): string {
    return this.href;
  }
}

interface IHistoryItem {
  state: unknown;
  title: string | null;
  url?: string | null;
}

export class FackHistory implements History {
  location: FackLocation;
  historyEventEmitters: HistoryEventEmitters;
  private current: number;
  private queue: IHistoryItem[];

  constructor(location: FackLocation, historyEventEmitters: HistoryEventEmitters) {
    this.location = location;
    this.historyEventEmitters = historyEventEmitters;
    this.current = 0;
    this.queue = [
      {
        state: null,
        title: null,
        url: location.href,
      },
    ];
  }

  scrollRestoration: ScrollRestoration = 'manual';

  get length(): number {
    return this.queue.length;
  }

  get state(): unknown {
    return this.queue[this.current].state;
  }

  private refreshLocation() {
    this.location.refreshLocation(
      new URL(this.queue[this.current].url || this.location.href, this.location.origin)
        .href,
    );
  }

  go(delta?: number): void {
    if (!delta) return;
    const newCurrent = this.current + delta;
    if (newCurrent < 0 || newCurrent >= this.queue.length) return;
    this.current = newCurrent;
    this.refreshLocation();
    this.historyEventEmitters.emit('popstate', new PopStateEvent('popstate'));
  }

  back() {
    this.go(-1);
  }

  forward() {
    this.go(1);
  }

  private checkUrl(url: string, type: 'pushState' | 'replaceState') {
    const urlObj = new URL(url, this.location.href);
    if (urlObj.origin !== this.location.origin) {
      throw new DOMException(
        `Failed to execute '${type}' on 'History': A history state object with URL '${url}' cannot be created in a document with origin '${this.location.origin}' and URL '${this.location.href}}'.`,
      );
    }
  }

  pushState(state: unknown, title: string | null, url?: string | null): void {
    if (url) this.checkUrl(url, 'pushState');
    this.queue.splice(this.current, this.queue.length - 1 - this.current, {
      state,
      title,
      url,
    });
    this.current = this.queue.length - 1;
    this.refreshLocation();
  }

  replaceState(state: unknown, title: string | null, url?: string | null): void {
    if (url) this.checkUrl(url, 'replaceState');
    this.queue[this.current] = {
      state,
      title,
      url,
    };
    this.refreshLocation();
  }
}

export type HistoryEvents = 'popstate' | 'hashchange';

export class HistoryEventEmitters {
  popstate: EventListener[] = [];
  hashchange: EventListener[] = [];

  onpopstate: EventListener;
  onhashchange: EventListener;

  on(type: HistoryEvents, callback: EventListener) {
    this[type].push(callback);
  }

  emit(type: HistoryEvents, event: PopStateEvent | HashChangeEvent) {
    this[`on${type}` as 'onpopstate' | 'onhashchange']?.(event);
    this[type].forEach((callback) => callback(event));
  }

  off(type: HistoryEvents, callback: EventListener) {
    this[type] = this[type].filter((item) => item !== callback);
  }
}

export function historySandbox(initialUrl: string) {
  const historyEventEmitters = new HistoryEventEmitters();
  const location = new FackLocation(getUrlObj(initialUrl).href);
  const history = new FackHistory(location, historyEventEmitters);
  const fakeHistory = function History() {
    throw new TypeError('Illegal constructor');
  };
  fakeHistory.prototype = history;
  fakeHistory.prototype.constructor = fakeHistory;
  return {
    location,
    history,
    History: fakeHistory,
    historyEventEmitters,
  };
}
