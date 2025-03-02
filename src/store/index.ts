import { createUpdater } from '../updater';
import { shallowEqual } from '../tools';
import {
  cacheIdentify,
  extractInstance,
  createField as createInstanceField,
  createMethod as createInstanceMethod
} from './instance';
import type { Key, SignalStore, Store } from './type';
import type {
  Action,
  Dispatch,
  Model,
  ModelInstance,
  StateConfig
} from '../updater/type';
import type { ModelKey } from '../key/type';

export function modelKeyIdentifier() {
  return true;
}

export function isModelKey<S, T extends ModelInstance>(
  data: unknown
): data is ModelKey<S, T> {
  if (!data) {
    return false;
  }
  return (data as any).modelKeyIdentifier === modelKeyIdentifier;
}

export function createPrimaryKey<S, T extends ModelInstance, D extends S>(
  modelFn: Model<S, T> | Key<S, T>,
  defaultState?: D
): Key<S, T> {
  const model = isModelKey<S, T>(modelFn) ? modelFn.source : modelFn;
  const wrapModel = function wrapModel(state: S) {
    return model(state);
  };
  wrapModel.source = model;
  wrapModel.modelKeyIdentifier = modelKeyIdentifier;
  if (arguments.length > 1) {
    wrapModel.defaultState = defaultState;
  }
  return wrapModel;
}

export function createStore<S, T extends ModelInstance>(
  modelLike: Model<S, T> | Key<S, T>,
  config: StateConfig<S> = {}
): Store<S, T> {
  const model: Model<S, T> = isModelKey<S, T>(modelLike)
    ? modelLike.source
    : modelLike;
  const modelKey = isModelKey<S, T>(modelLike) ? modelLike : undefined;
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
  const store: Store<S, T> = {
    key:
      modelKey ??
      ('state' in config
        ? createPrimaryKey(model, config.state)
        : createPrimaryKey(model)),
    subscribe(dispatcher: Dispatch) {
      const { connect, disconnect } = updater.createTunnel(dispatcher);
      connect();
      return disconnect;
    },
    getInstance(): T {
      return extractInstance(updater);
    },
    update(args?: { model?: Model<S, T>; state?: S }) {
      updater.update(args);
    },
    destroy() {
      updater.destroy();
    },
    payload<R>(
      callback?: (payload: R | undefined) => R | undefined
    ): R | undefined {
      return updater.payload<R>(callback);
    },
    isDestroyed() {
      return updater.isDestroyed;
    },
    updater
  };
  return store;
}

export function createSignal<S, T extends ModelInstance>(
  store: Store<S, T>
): SignalStore<S, T> {
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
  return {
    key: store.key,
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
      const signal = function signal() {
        return extractInstance(store.updater, collectUsedFields);
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
      signal.payload = function payload<R>(
        callback?: (payload: R | undefined) => R | undefined
      ): R | undefined {
        return store.payload<R>(callback);
      };
      signalStore.enabled = true;
      signalStore.started = true;
      return signal;
    }
  };
}

export const createField = createInstanceField;

export const createMethod = createInstanceMethod;
