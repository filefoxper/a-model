import { createStore, createPrimaryKey } from '../store';
import { isModelKey, validations } from '../validation';
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
  R extends undefined | ((ins: () => T) => any) = undefined
>(
  model: Model<S, T> | Key<S, T, R> | ModelUsage<Model<S, T>, R>,
  config: StateConfig<S, R> = {}
): ModelKey<S, T, R> {
  const wrapModel = createPrimaryKey(model, config);
  wrapModel.createStore = function createKeyStore(
    storeConfig: StateConfig<S> = {}
  ) {
    return createStore(wrapModel, { ...config, ...storeConfig });
  };
  wrapModel.extends = function extendsKey<E extends Record<string, any>>(
    e: E
  ): ModelKey<S, T, R> & E {
    return Object.assign(wrapModel as ModelKey<S, T, R>, e);
  };
  return wrapModel as ModelKey<S, T, R>;
}

createKey.isModelKey = isModelKey;

export function createStores(
  modelKeys: (
    | ModelKey<any, any, any>
    | StoreIndex<any, any, any>
    | Key<any, any, any>
  )[],
  config: Config = {}
): StoreCollection {
  const state = { destroyed: false };
  const storeUnits = modelKeys.map(modelKey => {
    if (
      typeof modelKey === 'function' &&
      typeof modelKey.createStore === 'function'
    ) {
      return modelKey.createStore();
    }
    const k = typeof modelKey === 'function' ? modelKey : modelKey.key;
    return createStore(
      k,
      'defaultState' in k ? { ...config, state: k.defaultState } : config
    );
  });
  return {
    find<
      S,
      T extends ModelInstance,
      R extends undefined | ((ins: () => T) => any) = undefined
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
    update(...keys: (ModelKey<any, any, any> | StoreIndex<any, any, any>)[]) {
      if (state.destroyed) {
        return;
      }
      storeUnits.forEach((un, i) => {
        const keyLike = keys[i];
        if (!keyLike) {
          return;
        }
        const ifIsModelKey = validations.isModelKey(keyLike);
        const key: Key = ifIsModelKey ? keyLike : keyLike.key;
        un.update({
          key
        });
      });
    },
    keys() {
      return storeUnits.map(({ key }) => key);
    },
    destroy() {
      storeUnits.forEach(unit => {
        unit.destroy();
      });
      state.destroyed = true;
    }
  };
}
