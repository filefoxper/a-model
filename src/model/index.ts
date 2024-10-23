import type { Model, ModelInstance } from './type';

export function refreshInstance<S, T extends ModelInstance>(
  model: Model<S, T>,
  state: S
) {
  return model(state);
}
