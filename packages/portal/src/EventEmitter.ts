/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
type CallbackFunc<T, R> = (params?: T) => R;

export enum PortalEvents {
  message = 'message',
  beforeServiceUmount = 'beforeServiceUmount',
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type EventType = 'message' | 'beforeServiceUmount' | (string & {});

export class EventEmitter<T = unknown, R = unknown> {
  private callbackMap: Record<string, CallbackFunc<T, R>[]>;

  private eventChannelConnected: Record<string, boolean> = { message: false };

  private eventDataQueue: Record<string, (T | undefined)[]>;

  constructor() {
    this.callbackMap = {
      message: [],
    };
    this.eventDataQueue = {
      message: [],
    };
  }

  clean() {
    this.callbackMap = {
      message: [],
    };
  }

  postMessage = (data: T): void => {
    this.emitEvent('message', data);
  };

  emitEvent = (type: EventType, data?: T): void => {
    if (!this.eventChannelConnected[type]) {
      (this.eventDataQueue[type] || (this.eventDataQueue[type] = [])).push(data);
      return;
    }
    if (this.callbackMap[type]) {
      this.callbackMap[type].forEach((item) => item(data));
    }
  };

  addPortalEventListener = (type: EventType, callback: CallbackFunc<T, R>): void => {
    if (!this.eventChannelConnected[type]) {
      this.eventChannelConnected[type] = true;
      this.eventDataQueue[type]?.forEach(callback);
      delete this.eventDataQueue[type];
    }
    (this.callbackMap[type] || (this.callbackMap[type] = [])).push(callback);
  };

  removePortalEventListener = (type: EventType, callback: CallbackFunc<T, R>): void => {
    if (this.callbackMap[type]) {
      this.callbackMap[type] = this.callbackMap[type].filter((cb) => cb === callback);
    }
  };
}
