import { createProxy, shallowEqual } from '../tools';
import type { FieldStructure, MethodStructure } from './type';
import type { Action, ModelInstance, Updater } from '../updater/type';

export const cacheIdentify = {
  field(d: unknown): d is FieldStructure {
    if (!d) {
      return false;
    }
    const f = d as { identifier: (d: unknown) => boolean };
    return f.identifier === cacheIdentify.field;
  },
  method(d: unknown): d is MethodStructure {
    if (typeof d !== 'function') {
      return false;
    }
    const m = d as ((...args: any[]) => any) & {
      identifier: (d: unknown) => boolean;
    };
    return m.identifier === cacheIdentify.method;
  }
};

export function createField<R extends () => any>(
  callback: R,
  deps?: unknown[]
): FieldStructure<ReturnType<R>> {
  const currentDeps = (function computeDeps(): unknown[] | undefined {
    if (deps == null) {
      return deps;
    }
    if (deps.some(d => cacheIdentify.field(d) && d.deps == null)) {
      return undefined;
    }
    return deps.flatMap(d => {
      if (cacheIdentify.field(d)) {
        return d.deps;
      }
      return d;
    });
  })();
  const value = callback();
  return {
    callback,
    deps: currentDeps,
    identifier: cacheIdentify.field,
    value,
    get(): ReturnType<R> {
      return value;
    }
  };
}

export function createMethod<
  R extends (...args: any[]) => any = (...args: any[]) => any
>(method: R): MethodStructure<R> {
  const replace = function replace(...args: any[]) {
    return method(...args);
  };
  Object.assign(replace, method());
  replace.identifier = cacheIdentify.method;
  return replace as MethodStructure<R>;
}

function wrapToActionMethod<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  methodName: string
) {
  const { cacheMethods } = updater;
  const cachedMethod = cacheMethods[methodName];
  if (typeof cachedMethod === 'function') {
    return cachedMethod;
  }
  const actionMethod = function actionMethod(...args: any[]) {
    const { instance } = updater;
    const method = instance[methodName];
    if (typeof method !== 'function') {
      throw new Error('Can not change methods in runtime.');
    }
    if (cacheIdentify.method(method)) {
      return method(...args);
    }
    const state = method(...args);
    const action: Action = {
      type: methodName,
      state,
      prevState: updater.state,
      instance: updater.instance,
      prevInstance: updater.instance,
      method: actionMethod
    };
    updater.notify(action);
    return state;
  };
  cacheMethods[methodName] = actionMethod;
  return actionMethod;
}

function wrapToField<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  propertyName: string,
  value: unknown,
  onGot?: (key: string, value: any) => any
) {
  const { cacheFields } = updater;
  if (!cacheIdentify.field(value)) {
    if (onGot) {
      onGot(propertyName, value);
    }
    return value;
  }
  const field = value;
  const cachedField = cacheFields[propertyName];
  if (cachedField) {
    return cachedField.getter;
  }
  const getter = {
    get() {
      const currentField = updater.instance[propertyName];
      if (!cacheIdentify.field(currentField)) {
        throw new Error('Field should always be field.');
      }
      const current = currentField.get();
      const fieldInCache = updater.cacheFields[propertyName];
      if (!currentField.deps || fieldInCache == null) {
        cacheFields[propertyName] = {
          getter,
          value: current,
          deps: currentField.deps
        };
        return current;
      }
      if (shallowEqual(currentField.deps, fieldInCache.deps)) {
        return fieldInCache.value;
      }
      cacheFields[propertyName] = {
        getter,
        value: current,
        deps: currentField.deps
      };
      return current;
    }
  };
  cacheFields[propertyName] = { getter, value: field.value, deps: field.deps };
  return getter;
}

export function extractInstance<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  onGet?: (key: string, value: any) => any
) {
  const { instance } = updater;
  if (typeof instance !== 'object' || !instance) {
    throw new Error('The instance should be an object or array.');
  }
  const properties = Object.getOwnPropertyNames(instance);
  const handleGetter = function handleGetter(key: string, value: any) {
    if (!onGet) {
      return;
    }
    onGet(key, value);
  };
  return createProxy(instance, {
    get(target: T, p: string): any {
      const value = target[p];
      // 行为方法只代理非继承的自身方法
      if (typeof value === 'function' && properties.indexOf(p) >= 0) {
        const actionMethod = wrapToActionMethod(updater, p);
        Object.assign(actionMethod, value);
        handleGetter(p, actionMethod);
        return actionMethod;
      }
      return wrapToField(updater, p, value, handleGetter);
    },
    set(): boolean {
      return false;
    }
  });
}
