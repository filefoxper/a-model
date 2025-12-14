import { createStore, createField, createMethod } from '../store';
import { createKey } from '../key';
import { modelUsageIdentifier } from '../identifiers';
import { defaultSelector } from '../defaults';
import type { ModelUsage } from '../store/type';
import type { Config, Model, ModelInstance } from '../updater/type';

export function configModel(config: Config) {
  const model = function model<
    S,
    T extends ModelInstance,
    R extends (instance: () => T) => any = (instance: () => T) => T
  >(modelFn: Model<S, T>, wrapper?: R): ModelUsage<S, T, R> {
    const currentSelector = wrapper ?? (defaultSelector as R);
    const modelWrapper = function modelWrapper(state: S) {
      return modelFn(state);
    };
    modelWrapper.produce = function produce<
      C extends (instance: () => T) => any = (instance: () => T) => T
    >(s: C) {
      return model<S, T, C>(modelFn, s);
    };
    modelWrapper.createKey = function createModelKey(state?: S) {
      return createKey<S, T, R>(
        modelFn,
        arguments.length
          ? { ...config, state, wrapper: currentSelector }
          : { ...config, wrapper: currentSelector }
      );
    };
    modelWrapper.createStore = function createModelStore(state?: S) {
      return createStore<S, T, R>(
        modelFn,
        arguments.length
          ? { ...config, state, wrapper: currentSelector }
          : { ...config, wrapper: currentSelector }
      );
    };
    modelWrapper.extends = function extendsModelUsage<
      E extends Record<string, any>
    >(e: E) {
      return Object.assign(modelWrapper, e);
    };
    modelWrapper.wrapper = currentSelector;
    modelWrapper.modelUsageIdentifier = modelUsageIdentifier;
    return modelWrapper;
  };

  model.createField = createField;
  model.createMethod = createMethod;

  return model;
}
