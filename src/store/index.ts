import { createUpdater } from '../updater';
import { shallowEqual } from '../tools';
import { cacheIdentify, extractInstance } from './instance';
import type { Store } from './type';
import type {
  Action,
  Config,
  Dispatch,
  Model,
  ModelInstance
} from '../updater/type';

export function createStore<S, T extends ModelInstance>(
  model: Model<S, T>,
  config: Config,
  defaultState?: S
) {
  const hasDefaultState = arguments.length > 2;
  const updater = hasDefaultState
    ? createUpdater(model, config, defaultState)
    : createUpdater(model, config);
  const store: Store<S, T> = {
    updater,
    createTunnel(dispatcher: Dispatch) {
      const tunnel = updater.createTunnel(dispatcher);
      return {
        connect() {
          return tunnel.connect();
        },
        disconnect() {
          return tunnel.disconnect();
        },
        getInstance() {
          return extractInstance(updater);
        }
      };
    },
    createSignal(dispatcher: Dispatch) {
      const signalStore: {
        collection: null | Record<string, any>;
        enabled: boolean;
      } = {
        collection: null,
        enabled: true
      };
      const dispatch = function dispatch(action: Action) {
        const { collection } = signalStore;
        if (collection == null) {
          dispatcher(action);
          return;
        }
        const current = extractInstance(updater);
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
      const tunnel = updater.createTunnel(dispatch);
      return {
        connect() {
          return tunnel.connect();
        },
        disconnect() {
          return tunnel.disconnect();
        },
        getSignal() {
          const collectUsedFields = function collectUsedFields(
            key: string,
            val: any
          ) {
            if (!signalStore.enabled) {
              return;
            }
            signalStore.collection = signalStore.collection || {};
            signalStore.collection[key] = val;
          };
          const signal = function signal() {
            return extractInstance(updater, collectUsedFields);
          };
          signal.startStatistics = function startStatistics() {
            signalStore.enabled = true;
          };
          signal.stopStatistics = function stopStatistics() {
            signalStore.enabled = false;
          };
          signal.getStore = function getStore() {
            return store;
          };
          signalStore.enabled = true;
          return signal;
        }
      };
    },
    getInstance(): T {
      return extractInstance(updater);
    },
    initialize(args?: {
      stats?: { state: S };
      model?: Model<S, T>;
      config?: Config;
    }) {
      updater.initialize(args);
    },
    payload<R>(
      callback?: (payload: R | undefined) => R | undefined
    ): R | undefined {
      return updater.payload<R>(callback);
    }
  };
  return store;
}

function modelKeyIdentifier() {
  return true;
}

export function createKey<S, T extends ModelInstance>(
  model: Model<S, T>,
  defaultState?: S
) {
  const hasDefaultState = arguments.length > 1;
  const wrapModel = function wrapModel(state: S) {
    return model(state);
  };
  wrapModel.createStore = function createWrapModelStore(config?: Config) {
    return hasDefaultState
      ? createStore(wrapModel, config || {}, defaultState)
      : createStore(wrapModel, config || {});
  };
  wrapModel.source = model;
  wrapModel.modelKeyIdentifier = modelKeyIdentifier;
  return wrapModel;
}

createKey.isModelKey = function isModelKey(data: unknown) {
  if (!data) {
    return false;
  }
  return (data as any).modelKeyIdentifier === modelKeyIdentifier;
};
