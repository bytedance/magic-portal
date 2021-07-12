/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventType, IClientWindow } from '@magic-microservices/portal';
import { getHash } from '@magic-microservices/portal-utils';
import { PuzzleServiceInstance } from './puzzleServiceCreator';

interface puzzleMessageData {
  type: string;
  data: unknown;
  origin: string;
  _isPuzzle: boolean;
}

// TODO: 优化 eventEmitter 类型定义
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PuzzleEventListener = (evt: any) => void;

export type IPuzzleWrappedEventCallback = (evt: MessageEvent) => void;

const _id = () => {
  return getHash();
};

const handlePuzzleCallback =
  (callback: PuzzleEventListener, type: string) =>
    (e: MessageEvent): void => {
      if (e?.data?._isPuzzle && e?.data?.type === type) {
        callback(e.data.data);
      }
    };

const createPuzzleData = (type: string, data?: unknown): puzzleMessageData => ({
  type,
  data,
  _isPuzzle: true,
  origin: window.location.origin,
});

class CallbackMap {
  private generatedHashMap: Record<string, true> = {};
  private hashToRawCallbacks: [string, IPuzzleWrappedEventCallback][] = [];
  private hashToActualCallbacks: Record<string, IPuzzleWrappedEventCallback> = {};

  genId = (): string => {
    let id: string = _id();
    while (this.generatedHashMap[id]) {
      id = _id();
    }
    this.generatedHashMap[id] = true;
    return id;
  };

  addCallback(callback: PuzzleEventListener, type: string): IPuzzleWrappedEventCallback {
    const id = this.genId();
    this.hashToRawCallbacks.push([id, callback]);
    const wrappedCallback: IPuzzleWrappedEventCallback = (...args) =>
      handlePuzzleCallback(callback, type)(...args);
    this.hashToActualCallbacks[id] = wrappedCallback;
    return wrappedCallback;
  }

  getCallback(callback: PuzzleEventListener): IPuzzleWrappedEventCallback | void {
    const hashCallback = this.hashToRawCallbacks.find((item) => item[1] === callback);

    if (!hashCallback) return;

    return hashCallback[1];
  }

  cleanCallback(callback: PuzzleEventListener) {
    const hashCallbackIndex = this.hashToRawCallbacks.findIndex(
      (item) => item[1] === callback,
    );
    const id = this.hashToRawCallbacks[hashCallbackIndex][0];
    this.hashToRawCallbacks.splice(hashCallbackIndex, 1);
    delete this.generatedHashMap[id];
    delete this.hashToActualCallbacks[id];
  }
}

export class Host extends CallbackMap {
  emit(
    target: PuzzleServiceInstance,
    type: EventType,
    data?: unknown,
    targetOrigin = '*',
  ): void {
    const PuzzleData = createPuzzleData(type, data);
    if (target instanceof HTMLIFrameElement) {
      return target.contentWindow?.postMessage(PuzzleData, targetOrigin);
    }
    return target.emitEvent(type, { data: PuzzleData });
  }

  on(
    target: PuzzleServiceInstance,
    type: EventType,
    callback: PuzzleEventListener,
  ): void {
    const puzzleCallback = this.addCallback(callback, type);
    // 过滤非puzzle的消息
    if (target instanceof HTMLIFrameElement) {
      return window.addEventListener('message', puzzleCallback);
    }
    return target.addPortalEventListener(type, puzzleCallback);
  }

  off(
    target: PuzzleServiceInstance,
    type: EventType,
    callback: PuzzleEventListener,
  ): void {
    const puzzleCallback = this.getCallback(callback);

    if (!puzzleCallback) return;

    target instanceof HTMLIFrameElement
      ? window.removeEventListener('message', puzzleCallback)
      : target.removePortalEventListener(type, puzzleCallback);

    this.cleanCallback(callback);
  }
}

export class Client extends CallbackMap {
  // 这里在new Client时可以判断下当前instance类型，寸一个变量作为标识？
  emit(type: EventType, data?: unknown, targetOrigin = '*'): void {
    const PuzzleData = createPuzzleData(type, data);
    if ((window as IClientWindow).portalHost?.emitEvent) {
      return (window as IClientWindow).portalHost?.emitEvent(type, { data: PuzzleData });
    }
    return window.parent.postMessage(PuzzleData, targetOrigin);
  }

  on(type: EventType, callback: PuzzleEventListener): void {
    const puzzleCallback = this.addCallback(callback, type);

    if ((window as IClientWindow).portalHost?.addEventListener) {
      return (window as IClientWindow).portalHost?.addEventListener(type, puzzleCallback);
    }
    return window.addEventListener('message', puzzleCallback);
  }

  off(type: EventType, callback: PuzzleEventListener): void {
    const puzzleCallback = this.getCallback(callback);

    if (!puzzleCallback) return;

    const removeEventListener = (window as IClientWindow).portalHost?.removeEventListener;
    if (removeEventListener) {
      return removeEventListener(type, puzzleCallback);
    }
    window.removeEventListener('message', puzzleCallback);

    this.cleanCallback(callback);
  }
}
