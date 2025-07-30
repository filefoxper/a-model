import { createStore, createField, createMethod } from '../store';
import { createKey } from '../key';
import { modelUsageIdentifier } from '../identifiers';
import type { ModelUsage } from '../store/type';
import type { Config, Model, ModelInstance } from '../updater/type';

export function configModel(config: Config) {
  const model = function model<
    S,
    T extends ModelInstance,
    R extends (instance: () => T) => any = (instance: () => T) => T
  >(modelFn: Model<S, T>, selector?: R): ModelUsage<S, T, R> {
    const currentSelector =
      selector ??
      (function defaultSelector(i: () => T) {
        return i();
      } as R);
    const modelWrapper = function modelWrapper(state: S) {
      return modelFn(state);
    };
    modelWrapper.select = function select<
      C extends (instance: () => T) => any = (instance: () => T) => T
    >(s: C) {
      return model<S, T, C>(modelFn, s);
    };
    modelWrapper.createKey = function createModelKey(state?: S) {
      return createKey<S, T, R>(
        modelFn,
        arguments.length
          ? { ...config, state, selector: currentSelector }
          : { ...config, selector: currentSelector }
      );
    };
    modelWrapper.createStore = function createModelStore(state?: S) {
      return createStore<S, T, R>(
        modelFn,
        arguments.length
          ? { ...config, state, selector: currentSelector }
          : { ...config, selector: currentSelector }
      );
    };
    modelWrapper.selector = currentSelector;
    modelWrapper.modelUsageIdentifier = modelUsageIdentifier;
    return modelWrapper;
  };

  model.createField = createField;
  model.createMethod = createMethod;

  return model;
}
