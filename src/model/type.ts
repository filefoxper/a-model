import type { ModelKey } from '../key/type';
import type { Store } from '../store/type';
import type { ModelInstance, ValidInstance } from '../updater/type';

export interface ModelUsage<S, T extends ModelInstance> {
  (s: S): ValidInstance<S, T>;
  createKey: (state?: S) => ModelKey<S, T>;
  createStore: (state?: S) => Store<S, T>;
}
