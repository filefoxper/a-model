import { createKey } from '../connection';
import type { Model, ModelInstance } from '../updater/type';

export function createStore<S, T extends ModelInstance>(
  modelFn: Model<S, T>,
  state?: S
) {
  const hasDefaultState = arguments.length > 1;
  const key = hasDefaultState ? createKey(modelFn, state) : createKey(modelFn);
  return {
    key,
    static() {
      return key.createConnection();
    }
  };
}
