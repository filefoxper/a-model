import { createUpdater } from '../updater';
import { isModelKey, isModelUsage } from '../validation';
import { modelKeyIdentifier, modelStoreIdentifier } from '../identifiers';
import {
  extractInstance,
  createField as createInstanceField,
  createMethod as createInstanceMethod
} from './instance';
import type { Key, ModelUsage, Store } from './type';
import type {
  Dispatch,
  Model,
  ModelInstance,
  StateConfig,
  UpdaterStore
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
  const combinedMiddleWare = function combinedMiddleWare(s: UpdaterStore) {
    return function updaterMiddleWare(next: Dispatch) {
      const { middleWares } = conf;
      if (middleWares == null) {
        return next;
      }
      const updateMiddleWares = [...middleWares].reverse().map(middleWare => {
        return middleWare(s);
      });
      return updateMiddleWares.reduce((finalDispatcher, um) => {
        return um(finalDispatcher);
      }, next);
    };
  };
  const updater = createUpdater(model, combinedMiddleWare, conf);
  const key = modelKey ?? createPrimaryKey<S, T, S, R>(model, config);
  const getInstance = function getInstance(): T {
    return extractInstance(updater);
  };
  const store: Store<S, T, R> = {
    key,
    getToken() {
      return updater.token;
    },
    subscribe(dispatcher: Dispatch) {
      const { connect, disconnect } = updater.createTunnel(dispatcher);
      connect();
      return disconnect;
    },
    getInstance,
    update(args?: {
      model?: Model<S, T>;
      key?: Key<S, T, R>;
      initialState?: S;
      state?: S;
    }) {
      const updateArgs = args ?? {};
      if ('key' in updateArgs && updateArgs.key) {
        const { key: updatingKey, model: updatingModel, ...rest } = updateArgs;
        updater.update({ ...rest, model: updatingKey.source });
        store.key = updatingKey;
        return;
      }
      if ('model' in updateArgs && updateArgs.model) {
        const { key: updatingKey, model: updatingModel, ...rest } = updateArgs;
        updater.update({ ...rest, model: updatingModel });
        store.key = createPrimaryKey<S, T, S, R>(updatingModel, config);
        return;
      }
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
    isDestroyed() {
      return updater.isDestroyed;
    },
    extends<E extends Record<string, any>>(e: E): Store<S, T, R> & E {
      return Object.assign(store, e);
    },
    updater,
    modelStoreIdentifier
  };
  return store;
}

export const createField = createInstanceField;

export const createMethod = createInstanceMethod;

export { createSignal, createSelector } from './enhance';
