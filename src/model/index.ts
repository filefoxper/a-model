import { createField, createMethod } from '../connection';
import { createStore as createStoreObject } from '../store';
import type { Model, ModelInstance } from '../updater/type';

export const model = function model<S, T extends ModelInstance>(
  modelFn: Model<S, T>
) {
  const modelWrapper = function modelWrapper(state: S) {
    return modelFn(state);
  };
  modelWrapper.createStore = function createStore(state?: S) {
    const hasDefaultState = arguments.length > 0;
    return hasDefaultState
      ? createStoreObject(modelWrapper, state)
      : createStoreObject(modelWrapper);
  };
  return modelWrapper;
};

model.createField = createField;
model.createMethod = createMethod;
