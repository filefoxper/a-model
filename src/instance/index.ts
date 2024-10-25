import { createSimpleProxy } from '../tools';
import type { ModelInstance, Updater } from '../updater/type';

function wrapToActionMethod<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  source: {
    name: string;
    method: (...args: any[]) => any;
  }
) {
  const actionMethod = function actionMethod(...args: any[]) {};
  return actionMethod;
}

export function extractInstance<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  const { instance, model, state } = updater;
  createSimpleProxy(instance, {
    get(target: T, p: string, receiver: any): any {
      const value = target[p];
      if (typeof value === 'function') {
        return wrapToActionMethod(updater, {
          name: p,
          method: value as (...args: any[]) => any
        });
      }
      return value;
    }
  });
}
