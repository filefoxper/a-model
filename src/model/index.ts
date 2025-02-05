import { createConnection, createField, createMethod } from '../connection';
import { createKey } from '../store';
import type { ModelUsage } from './type';
import type { Config, Model, ModelInstance } from '../updater/type';

export const model = function model<S, T extends ModelInstance>(
  modelFn: Model<S, T>
): ModelUsage<S, T> {
  const modelWrapper = function modelWrapper(state: S) {
    return modelFn(state);
  };
  modelWrapper.createKey = function createModelKey(state?: S) {
    const hasDefaultState = arguments.length > 0;
    return hasDefaultState
      ? createKey(modelWrapper, state)
      : createKey(modelWrapper);
  };
  modelWrapper.createConnection = function createModelConnection(
    config?: Config<S>
  ) {
    return createConnection(modelWrapper, config || {});
  };
  return modelWrapper;
};

model.createField = createField;
model.createMethod = createMethod;
