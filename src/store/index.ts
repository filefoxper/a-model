import { createUpdater } from '../updater';
import { shallowEqual } from '../tools';
import { isModelKey, isModelUsage } from '../validation';
import { modelKeyIdentifier } from '../identifiers';
import {
  cacheIdentify,
  extractInstance,
  createField as createInstanceField,
  createMethod as createInstanceMethod
} from './instance';
import type { Key, ModelUsage, SignalStore, Store } from './type';
import type {
  Action,
  Dispatch,
  Model,
  ModelInstance,
  StateConfig
} from '../updater/type';

export function createPrimaryKey<
  S,
  T extends ModelInstance,
  D extends S,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(
  modelFn: Model<S, T> | Key<S, T> | ModelUsage<S, T, R>,
  config: StateConfig<D, R> = {}
): Key<S, T, R> {
  const ifModelKey = isModelKey<S, T, R>(modelFn);
  const ifModelUsage = isModelUsage<S, T, R>(modelFn);
  const model = ifModelKey ? modelFn.source : modelFn;
  const selector =
    config.selector ??
    (ifModelKey || ifModelUsage
      ? modelFn.selector
      : function defaultSelector(i: () => T) {
          return i();
        });
  const wrapModel = function wrapModel(state: S) {
    return model(state);
  };
  wrapModel.source = model;
  wrapModel.selector = selector;
  wrapModel.modelKeyIdentifier = modelKeyIdentifier;
  if ('state' in config) {
    wrapModel.defaultState = config.state;
  }
  return wrapModel as Key<S, T, R>;
}

export function createStore<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(
  modelLike: Model<S, T> | Key<S, T, R> | ModelUsage<S, T, R>,
  config: StateConfig<S, R> = {}
): Store<S, T, R> {
  const ifModelKey = isModelKey<S, T, R>(modelLike);
  const model: Model<S, T> | ModelUsage<S, T, R> = ifModelKey
    ? modelLike.source
    : modelLike;
  const modelKey = ifModelKey ? modelLike : undefined;
  const conf = (function computeConfig() {
    const hasConfigState = 'state' in config;
    const hasKeyState = !!modelKey && 'defaultState' in modelKey;
    if (hasConfigState) {
      return config;
    }
    if (hasKeyState) {
      return { ...config, state: modelKey?.defaultState };
    }
    return config;
  })();
  const updater = createUpdater(model, conf);
  const key = modelKey ?? createPrimaryKey<S, T, S, R>(model, config);
  const getInstance = function getInstance(): T {
    return extractInstance(updater);
  };
  const store: Store<S, T, R> = {
    key,
    subscribe(dispatcher: Dispatch) {
      const { connect, disconnect } = updater.createTunnel(dispatcher);
      connect();
      return disconnect;
    },
    getInstance,
    update(args?: { model?: Model<S, T>; state?: S }) {
      updater.update(args);
    },
    destroy() {
      updater.destroy();
    },
    payload<P>(
      callback?: (payload: P | undefined) => P | undefined
    ): P | undefined {
      return updater.payload<P>(callback);
    },
    select(): ReturnType<R> {
      if (typeof key.selector !== 'function') {
        throw new Error(
          'Can not find selector from model. Usage model(fn).select(fn) to set it before use.'
        );
      }
      return key.selector(getInstance);
    },
    isDestroyed() {
      return updater.isDestroyed;
    },
    updater
  };
  return store;
}

export function createSignal<
  S,
  T extends ModelInstance,
  R extends (instance: () => T) => any = (instance: () => T) => any
>(store: Store<S, T, R>): SignalStore<S, T, R> {
  const signalStore: {
    collection: null | Record<string, any>;
    started: boolean;
    enabled: boolean;
  } = {
    collection: null,
    started: false,
    enabled: false
  };
  const middleWare = (dispatcher: Dispatch) => {
    return (action: Action) => {
      if (!signalStore.enabled) {
        dispatcher(action);
        return;
      }
      const { collection } = signalStore;
      if (collection == null) {
        dispatcher(action);
        return;
      }
      const current = extractInstance(store.updater);
      const keys = Object.keys(collection);
      const currentCollectionEntries = keys.map((key): [string, any] => {
        const field = current[key];
        if (cacheIdentify.field(field)) {
          return [key, field.get()];
        }
        return [key, field];
      });
      const currentCollection = Object.fromEntries(currentCollectionEntries);
      if (!shallowEqual(collection, currentCollection)) {
        dispatcher(action);
      }
    };
  };
  const { key: storeKey } = store;
  return {
    key: storeKey,
    subscribe(dispatcher: Dispatch): () => void {
      return store.subscribe(middleWare(dispatcher));
    },
    getSignal() {
      const collectUsedFields = function collectUsedFields(
        key: string,
        val: any
      ) {
        if (!signalStore.started) {
          return;
        }
        signalStore.collection = signalStore.collection || {};
        signalStore.collection[key] = val;
      };
      const getInstance = function getInstance() {
        return extractInstance(store.updater, collectUsedFields);
      };
      const signal = function signal() {
        return getInstance();
      };
      signal.select = function select() {
        if (typeof storeKey.selector !== 'function') {
          throw new Error(
            'Can not find selector from model. Usage model(fn).select(fn) to set it before use.'
          );
        }
        return storeKey.selector(getInstance);
      };
      signal.startStatistics = function startStatistics() {
        signalStore.started = true;
      };
      signal.stopStatistics = function stopStatistics() {
        signalStore.started = false;
      };
      signal.subscribe = function subscribe(dispatchCallback: Dispatch) {
        return store.subscribe(dispatchCallback);
      };
      signal.payload = function payload<P>(
        callback?: (payload: P | undefined) => P | undefined
      ): P | undefined {
        return store.payload<P>(callback);
      };
      signalStore.enabled = true;
      signalStore.started = true;
      return signal;
    }
  };
}

export const createField = createInstanceField;

export const createMethod = createInstanceMethod;
