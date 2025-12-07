import { createProxy, shallowEqual } from '../tools';
import type { InstanceCache, FieldStructure, MethodStructure } from './type';

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

function wrapToField<T extends Record<string, any>>(
  cache: InstanceCache<T>,
  propertyName: string,
  value: unknown,
  onGot?: (key: string, value: any) => any
) {
  const { cacheFields } = cache;
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
      const currentField = cache.target[propertyName];
      if (!cacheIdentify.field(currentField)) {
        throw new Error('Field should always be field.');
      }
      const current = currentField.get();
      const fieldInCache = cache.cacheFields[propertyName];
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

function wrapToActionMethod<T extends Record<string, any>>(
  cache: InstanceCache<T>,
  methodName: string
) {
  const { cacheMethods } = cache;
  const cachedMethod = cacheMethods[methodName];
  if (typeof cachedMethod === 'function') {
    return cachedMethod;
  }
  const actionMethod = function actionMethod(...args: any[]) {
    const { target } = cache;
    const method = target[methodName];
    if (typeof method !== 'function') {
      throw new Error('Can not change methods in runtime.');
    }
    return method(...args);
  };
  cacheMethods[methodName] = actionMethod;
  return actionMethod;
}

export const cacheProperties = <T extends Record<string, any>>(
  cache: InstanceCache<T>,
  onGet?: (key: string, value: any) => any
) => {
  return function createCachePropertiesProxy(): T {
    const instance = cache.target;
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
          const actionMethod = wrapToActionMethod(cache, p);
          Object.assign(actionMethod, value);
          handleGetter(p, actionMethod);
          return actionMethod;
        }
        return wrapToField(cache, p, value, handleGetter);
      },
      set(): boolean {
        return false;
      }
    });
  };
};
