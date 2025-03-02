import { createStore, createField, createMethod } from '../store';
import { createKey } from '../key';
import type { ModelUsage } from './type';
import type { Config, Model, ModelInstance } from '../updater/type';

export function configModel(config: Config) {
  const model = function model<S, T extends ModelInstance>(
    modelFn: Model<S, T>
  ): ModelUsage<S, T> {
    const modelWrapper = function modelWrapper(state: S) {
      return modelFn(state);
    };
    modelWrapper.createKey = function createModelKey(state?: S) {
      return createKey(
        modelWrapper,
        arguments.length ? { ...config, state } : config
      );
    };
    modelWrapper.createStore = function createModelStore(state?: S) {
      return createStore(
        modelWrapper,
        arguments.length ? { ...config, state } : config
      );
    };
    return modelWrapper;
  };

  model.createField = createField;
  model.createMethod = createMethod;

  return model;
}
