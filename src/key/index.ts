import { createStore, createPrimaryKey } from '../store';
import { isModelKey } from '../validation';
import type { Store, Key, StoreIndex, ModelUsage } from '../store/type';
import type { ModelKey, StoreCollection } from './type';
import type {
  Config,
  Model,
  ModelInstance,
  StateConfig
} from '../updater/type';

export function createKey<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(
  model: Model<S, T> | Key<S, T, R> | ModelUsage<S, T, R>,
  config: StateConfig<S, R> = {}
): ModelKey<S, T, R> {
  const wrapModel = createPrimaryKey(model, config);
  wrapModel.createStore = function createKeyStore(
    storeConfig: StateConfig<S> = {}
  ) {
    return createStore(wrapModel, { ...config, ...storeConfig });
  };
  return wrapModel as ModelKey<S, T, R>;
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
    find<
      S,
      T extends ModelInstance,
      R extends (ins: () => T) => any = (ins: () => T) => T
    >(key: Key<S, T, R> | StoreIndex<S, T, R>): Store<S, T, R> | null {
      const found = storeUnits.find(c => {
        if (typeof key === 'function') {
          return c.key === key;
        }
        return c.key === key.key;
      });
      if (!found) {
        return null;
      }
      return found as unknown as Store<S, T, R>;
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
