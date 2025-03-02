import { createStore, createPrimaryKey, isModelKey } from '../store';
import type { Store, Key, StoreIndex } from '../store/type';
import type { ModelKey, StoreCollection } from './type';
import type {
  Config,
  Model,
  ModelInstance,
  StateConfig
} from '../updater/type';

export function createKey<S, T extends ModelInstance>(
  model: Model<S, T> | Key<S, T>,
  config: StateConfig<S> = {}
): ModelKey<S, T> {
  const hasDefaultState = 'state' in config;
  const wrapModel = hasDefaultState
    ? createPrimaryKey(model, config.state)
    : createPrimaryKey(model);
  wrapModel.createStore = function createKeyStore(
    storeConfig: StateConfig<S> = {}
  ) {
    return createStore(wrapModel, { ...config, ...storeConfig });
  };
  return wrapModel as ModelKey<S, T>;
}

createKey.isModelKey = isModelKey;

export function createStores(
  modelKeys: (ModelKey | StoreIndex)[],
  config: Config = {}
): StoreCollection {
  const state = { destroyed: false };
  const storeUnits = modelKeys.map(modelKey => {
    if (typeof modelKey === 'function') {
      return modelKey.createStore();
    }
    const k = modelKey.key;
    return createStore(
      k,
      'defaultState' in k ? { ...config, state: k.defaultState } : config
    );
  });
  return {
    find<S, T extends ModelInstance>(
      key: Key<S, T> | StoreIndex<S, T>
    ): Store<S, T> | null {
      const found = storeUnits.find(c => {
        if (typeof key === 'function') {
          return c.key === key;
        }
        return c.key === key.key;
      });
      if (!found) {
        return null;
      }
      return found as unknown as Store<S, T>;
    },
    update(...keys: (ModelKey | StoreIndex)[]) {
      if (state.destroyed) {
        return;
      }
      storeUnits.forEach((un, i) => {
        const key = keys[i];
        if (!key) {
          return;
        }
        Object.assign(un, { key });
        un.update({
          model: typeof key === 'function' ? key.source : key.key.source
        });
      });
    },
    destroy() {
      storeUnits.forEach(unit => {
        unit.destroy();
      });
      state.destroyed = true;
    }
  };
}
