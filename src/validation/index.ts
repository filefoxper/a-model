import {
  modelKeyIdentifier,
  modelStoreIdentifier,
  modelUsageIdentifier,
  tokenIdentifier
} from '../identifiers';
import type { Model, ModelInstance, Token } from '../updater/type';
import type { ModelKey } from '../key/type';
import type { ModelUsage, Store, StoreIndex } from '../store/type';

const noStateAModelKey = 'no-state-a-model-key';

export function createNoStateModel() {
  return function noStateModel(state: undefined) {
    return {
      [noStateAModelKey]: true
    };
  };
}

function isInstanceFromNoStateModel(instance: unknown) {
  if (instance == null) {
    return false;
  }
  if (typeof instance !== 'object') {
    return false;
  }
  const ins = instance as { [noStateAModelKey]?: true };
  return !!ins[noStateAModelKey];
}

export function isModelKey<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(data: unknown): data is ModelKey<S, T, R> {
  if (!data) {
    return false;
  }
  return (
    (data as any).modelKeyIdentifier === modelKeyIdentifier &&
    (data as any).modelKeyIdentifier()
  );
}

export function isModelUsage<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(data: unknown): data is ModelUsage<Model<S, T>, R> {
  if (!data) {
    return false;
  }
  return (
    (data as any).modelUsageIdentifier === modelUsageIdentifier &&
    (data as any).modelUsageIdentifier()
  );
}

export function isModelStore<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(data: unknown): data is Store<S, T, R> {
  if (!data) {
    return false;
  }
  return (
    (data as any).modelStoreIdentifier === modelStoreIdentifier &&
    (data as any).modelStoreIdentifier()
  );
}

export function isToken(data: unknown): data is Token {
  if (!data) {
    return false;
  }
  return (
    (data as any).tokenIdentifier === tokenIdentifier &&
    (data as any).tokenIdentifier()
  );
}

export function isStoreIndex<
  S,
  T extends ModelInstance,
  R extends (ins: () => T) => any = (ins: () => T) => T
>(data: unknown): data is StoreIndex<S, T, R> {
  if (!data) {
    return false;
  }
  return !!(data as any).key && isModelKey((data as any).key);
}

export const validations = {
  isInstanceFromNoStateModel,
  isModelKey,
  isModelStore,
  isModelUsage,
  isToken,
  isStoreIndex
};
