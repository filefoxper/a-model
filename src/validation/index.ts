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
