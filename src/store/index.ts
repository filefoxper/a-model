import { createConnection } from '../connection';
import type { Store } from './type';
import type { Connection, ConnectionKey } from '../connection/type';
import type { Config, Model, ModelInstance } from '../updater/type';

function modelKeyIdentifier() {
  return true;
}

export function createKey<S, T extends ModelInstance, D extends S>(
  model: Model<S, T>,
  defaultState?: D
): ConnectionKey<S, T, typeof model> {
  const hasDefaultState = arguments.length > 1;
  const wrapModel = function wrapModel(state: S) {
    return model(state);
  };
  wrapModel.createConnection = function createModelConnection(
    config?: Config<S>
  ) {
    return hasDefaultState
      ? createConnection(wrapModel, { ...config, state: defaultState })
      : createConnection(wrapModel, config || {});
  };
  wrapModel.createStore = function createKeyStore() {
    const connection = wrapModel.createConnection();
    return {
      get() {
        return connection;
      },
      destroy() {
        connection.destroy();
      }
    };
  };
  wrapModel.source = model;
  wrapModel.modelKeyIdentifier = modelKeyIdentifier;
  return wrapModel;
}

createKey.isModelKey = function isModelKey<S, T extends ModelInstance>(
  data: unknown
): data is ConnectionKey<S, T> {
  if (!data) {
    return false;
  }
  return (data as any).modelKeyIdentifier === modelKeyIdentifier;
};

export function createStore(...modelKeys: ConnectionKey[]): Store {
  const state = { destroyed: false };
  const storeUnits = modelKeys.map(modelKey => {
    return { key: modelKey, connection: modelKey.createConnection() };
  });
  return {
    find<S, T extends ModelInstance>(
      key: ConnectionKey<S, T>
    ): Connection<S, T> | null {
      const found = storeUnits.find(c => c.key === key);
      if (!found) {
        return null;
      }
      return found.connection as unknown as Connection<S, T>;
    },
    update(...keys: ConnectionKey[]) {
      if (state.destroyed) {
        return;
      }
      storeUnits.forEach((un, i) => {
        const key = keys[i];
        if (!key) {
          return;
        }
        un.connection.update({ model: key.source });
      });
    },
    destroy() {
      storeUnits.forEach(unit => {
        unit.connection.destroy();
      });
      state.destroyed = true;
    }
  };
}
