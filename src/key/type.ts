import type { Key, Store, StoreIndex } from '../store/type';
import type { ModelInstance } from '../updater/type';

export interface ModelKey<
  S = any,
  T extends ModelInstance = any,
  R extends (instance: () => T) => any = (instance: () => T) => T
> extends Key<S, T, R> {
  (s: S): T;
  createStore: () => Store<S, T, R>;
  extends: <E extends Record<string, any>>(e: E) => ModelKey<S, T, R> & E;
}

export interface StoreCollection {
  find: <
    S,
    T extends ModelInstance,
    R extends (instance: () => T) => any = (instance: () => T) => T
  >(
    key: ModelKey<S, T, R> | StoreIndex<S, T, R>
  ) => Store<S, T, R> | null;
  update: (...keys: (ModelKey | StoreIndex)[]) => void;
  keys: () => Key[];
  destroy: () => void;
}
