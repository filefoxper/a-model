import { createField, createKey, createMethod } from '../connection';
import type { Model, ModelInstance } from '../updater/type';

export const model = function model<S, T extends ModelInstance>(
  modelFn: Model<S, T>
) {
  const modelWrapper = function modelWrapper(state: S) {
    return modelFn(state);
  };
  function createStore(state?: S) {
    const hasDefaultState = arguments.length > 0;
    const key = hasDefaultState
      ? createKey(modelWrapper, state)
      : createKey(modelWrapper);
    return {
      key,
      static() {
        return key.createConnection();
      }
    };
  }
  modelWrapper.createStore = createStore;
  return modelWrapper;
};

model.createField = createField;
model.createMethod = createMethod;
