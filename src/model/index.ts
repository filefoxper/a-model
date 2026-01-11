import { createStore, createField, createMethod } from '../store';
import { createKey } from '../key';
import { modelUsageIdentifier } from '../identifiers';
import { defaultSelector } from '../defaults';
import type { ModelUsage } from '../store/type';
import type { Config, Instance, Model, PickState } from '../updater/type';

export function configModel(config: Config) {
  const model = function model<
    M extends Model,
    R extends (instance: () => Instance<M>) => any = (
      instance: () => Instance<M>
    ) => Instance<M>
  >(modelFn: M, wrapper?: R): ModelUsage<M, R> {
    const currentSelector = wrapper ?? (defaultSelector as R);
    const modelWrapper = function modelWrapper(state: PickState<M>) {
      return modelFn(state);
    } as ModelUsage<M, R>;
    modelWrapper.produce = function produce<
      C extends (instance: () => Instance<M>) => any = (
        instance: () => Instance<M>
      ) => Instance<M>
    >(s: C) {
      return model<M, C>(modelFn, s);
    };
    modelWrapper.createKey = function createModelKey(
      state?: PickState<typeof modelFn>
    ) {
      return createKey<PickState<M>, Instance<M>, R>(
        modelFn as Model<PickState<M>, Instance<M>>,
        arguments.length
          ? { ...config, state, wrapper: currentSelector }
          : { ...config, wrapper: currentSelector }
      );
    };
    modelWrapper.createStore = function createModelStore(state?: PickState<M>) {
      return createStore<PickState<M>, Instance<M>, R>(
        modelFn as Model<PickState<M>, Instance<M>>,
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
