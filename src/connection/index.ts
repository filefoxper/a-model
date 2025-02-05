import { createUpdater } from '../updater';
import { shallowEqual } from '../tools';
import {
  cacheIdentify,
  extractInstance,
  createField as createInstanceField,
  createMethod as createInstanceMethod
} from './instance';
import type { Connection } from './type';
import type {
  Action,
  Config,
  Dispatch,
  Model,
  ModelInstance
} from '../updater/type';

export function createConnection<S, T extends ModelInstance>(
  model: Model<S, T>,
  config: Config<S> = {}
): Connection<S, T> {
  const updater = createUpdater(model, config);
  const connection: Connection<S, T> = {
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
          signal.getConnection = function getConnection() {
            return connection;
          };
          signalStore.enabled = true;
          return signal;
        }
      };
    },
    getInstance(): T {
      return extractInstance(updater);
    },
    update(args?: { model?: Model<S, T>; config?: Config<S> }) {
      updater.update(args);
    },
    destroy() {
      updater.destroy();
    },
    payload<R>(
      callback?: (payload: R | undefined) => R | undefined
    ): R | undefined {
      return updater.payload<R>(callback);
    }
  };
  return connection;
}

export const createField = createInstanceField;

export const createMethod = createInstanceMethod;
