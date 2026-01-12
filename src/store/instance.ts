import { createProxy, shallowEqual } from '../tools';
import { defaultSelector } from '../defaults';
import { modelFieldIdentifier } from '../identifiers';
import { cacheIdentify, cacheProperties } from './cache';
import type { FieldStructure, InstanceCache, MethodStructure } from './type';
import type { Action, ModelInstance, Updater } from '../updater/type';

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
  function collect(pName: string, v: unknown) {
    if (onGot) {
      onGot(pName, v);
    }
  }
  const { cacheFields } = updater;
  if (!cacheIdentify.field(value)) {
    collect(propertyName, value);
    return value;
  }
  const field = value;
  const cachedField = cacheFields[propertyName];
  if (
    cachedField &&
    ((field.deps && shallowEqual(cachedField.deps, field.deps)) ||
      (!field.deps && cachedField.value === field.value))
  ) {
    const cacheFieldGetter = cachedField.getter;
    collect(propertyName, cacheFieldGetter);
    return cacheFieldGetter;
  }
  const getter = {
    identifier: modelFieldIdentifier,
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
  collect(propertyName, getter);
  return getter;
}

export function extractInstance<
  S,
  T extends ModelInstance,
  R extends undefined | ((ins: () => T) => any) = undefined
>(
  updater: Updater<S, T>,
  wrapper: R,
  cache: InstanceCache<T>,
  opts?: { onGet?: (key: string, value: any) => any }
): R extends undefined ? T : ReturnType<R extends undefined ? never : R> {
  const { onGet } = opts || {};
  const handleGetter = function handleGetter(key: string, value: any) {
    if (!onGet) {
      return;
    }
    onGet(key, value);
  };

  function generateInstance() {
    const { instance } = updater;
    if (typeof instance !== 'object' || !instance) {
      throw new Error('The instance should be an object or array.');
    }
    const properties = Object.getOwnPropertyNames(instance);
    return createProxy(instance, {
      get(target: T, p: string): any {
        const value = target[p];
        // 行为方法只代理非继承的自身方法
        if (typeof value === 'function' && properties.indexOf(p) >= 0) {
          const actionMethod = wrapToActionMethod(updater, p);
          Object.assign(actionMethod, value);
          return actionMethod;
        }
        return wrapToField(updater, p, value);
      },
      set(): boolean {
        return false;
      }
    });
  }

  const proxiedInstance = generateInstance();

  if (wrapper == null) {
    return proxiedInstance as R extends undefined ? T : never;
  }
  if (wrapper === defaultSelector) {
    return cacheProperties(
      { ...cache, target: proxiedInstance },
      handleGetter
    )() as R extends undefined ? T : never;
  }
  const wrapped = wrapper(generateInstance);
  if (typeof wrapped === 'object' && wrapped != null) {
    return cacheProperties({ ...cache, target: wrapped }, handleGetter)();
  }
  return wrapped;
}
