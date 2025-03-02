import { createStore as cs } from './store';
import { createKey as ck, createStores as css } from './key';
import { configModel } from './model';
import type { Config, Model, ModelInstance } from './updater/type';
import type { Key, Store, StoreIndex } from './store/type';
import type { ModelKey, StoreCollection } from './key/type';

export function config(configuration: Config = {}) {
  const createStore = function createStore<
    S,
    T extends ModelInstance,
    D extends S
  >(modelLike: Model<S, T> | Key<S, T>, state?: D): Store<S, T> {
    return cs<S, T>(
      modelLike,
      arguments.length > 1 ? { ...configuration, state } : configuration
    );
  };
  const createKey = function createKey<S, T extends ModelInstance, D extends S>(
    model: Model<S, T>,
    state?: D
  ): ModelKey<S, T> {
    const isKeySetState = arguments.length > 1;
    const key = ck<S, T>(
      model,
      isKeySetState ? { ...configuration, state } : configuration
    );
    key.createStore = function createKeyStore(s?: D) {
      return arguments.length > 0 ? createStore(key, s) : createStore(key);
    };
    return key;
  };
  createKey.isModelKey = ck.isModelKey;
  const createStores = function createStores(
    ...modelKeys: (ModelKey | StoreIndex)[]
  ): StoreCollection {
    return css(modelKeys, configuration);
  };
  const model = configModel(configuration);
  return {
    createStore,
    createKey,
    createStores,
    model
  };
}

const { createStore, createKey, createStores, model } = config();

export { createStore, createKey, createStores, model };

export { createSignal } from './store';

export { validations } from './validation';
