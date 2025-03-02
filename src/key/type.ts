import type { Key, Store, StoreIndex } from '../store/type';
import type { ModelInstance } from '../updater/type';

export interface ModelKey<S = any, T extends ModelInstance = any>
  extends Key<S, T> {
  (s: S): T;
  createStore: () => Store<S, T>;
}

export interface StoreCollection {
  find: <S, T extends ModelInstance>(
    key: ModelKey<S, T> | StoreIndex<S, T>
  ) => Store<S, T> | null;
  update: (...keys: (ModelKey | StoreIndex)[]) => void;
  destroy: () => void;
}
