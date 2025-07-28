import { modelKeyIdentifier, modelUsageIdentifier } from '../identifiers';
import type { ModelInstance } from '../updater/type';
import type { ModelKey } from '../key/type';
import type { ModelUsage } from '../store/type';

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

export const validations = {
  isInstanceFromNoStateModel
};

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
>(data: unknown): data is ModelUsage<S, T, R> {
  if (!data) {
    return false;
  }
  return (
    (data as any).modelUsageIdentifier === modelUsageIdentifier &&
    (data as any).modelUsageIdentifier()
  );
}
