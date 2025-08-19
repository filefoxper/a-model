import { cacheIdentify } from '../instance';
import { createProxy, shallowEqual } from '../../tools';
import type { Action, Dispatch, ModelInstance } from '../../updater/type';
import type { InstanceCache, SelectorOption, Store } from '../type';

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

export function createSelector<
  S,
  T extends ModelInstance,
  R extends (instance: () => T) => any = (instance: () => T) => T
>(store: Store<S, T, R>, opts?: SelectorOption) {
  const { equality } = opts ?? {};
  const selectStore: {
    selectedInstance: any;
  } = {
    selectedInstance: store.getInstance()
  };
  const cache: {
    selector?: (instance: () => T) => any;
    equality?: (c: any, n: any) => boolean;
    setSelect: (selector: ((instance: () => T) => any) | undefined) => void;
  } = {
    equality,
    setSelect(selector: ((instance: () => T) => any) | undefined) {
      cache.selector = selector;
      if (!selector) {
        return;
      }
      const currentSelectedInstance = selectStore.selectedInstance;
      const nextSelectedInstance = selector(store.getInstance);
      if (
        currentSelectedInstance === nextSelectedInstance ||
        (equality && equality(currentSelectedInstance, nextSelectedInstance))
      ) {
        return;
      }
      selectStore.selectedInstance = nextSelectedInstance;
    }
  };

  const propertiesCache: InstanceCache<any> = {
    target: store.getInstance(),
    cacheFields: {},
    cacheMethods: {}
  };

  const generateSelectedInstance = function generateSelectedInstance(
    getInstance: () => T
  ): any {
    const { key: storeKey } = store;
    if (cache.selector) {
      return cache.selector(getInstance);
    }
    if (!storeKey?.selector) {
      return getInstance();
    }
    const result = storeKey?.selector(getInstance);
    if (result == null || typeof result !== 'object') {
      throw new Error(
        'The default selector result should be an object or array'
      );
    }
    propertiesCache.target = result;
    return cacheProperties(propertiesCache)();
  };

  selectStore.selectedInstance = generateSelectedInstance(store.getInstance);

  const enhance = (dispatcher?: Dispatch) => {
    return (action: Action) => {
      const currentSelectedInstance = selectStore.selectedInstance;
      const nextSelectedInstance = generateSelectedInstance(store.getInstance);
      if (
        currentSelectedInstance === nextSelectedInstance ||
        (cache.equality &&
          cache.equality(currentSelectedInstance, nextSelectedInstance))
      ) {
        return;
      }
      selectStore.selectedInstance = nextSelectedInstance;
      if (dispatcher == null) {
        return;
      }
      dispatcher(action);
    };
  };

  function select(): ReturnType<R>;
  function select<C extends (instance: () => T) => any>(
    selector: C
  ): ReturnType<C>;
  function select<C extends ((instance: () => T) => any) | undefined>(
    selector?: C
  ) {
    cache.setSelect(selector);
    return selectStore.selectedInstance;
  }
  return {
    key: store.key,
    getToken() {
      return store.getToken();
    },
    subscribe(dispatcher?: Dispatch): () => void {
      return store.subscribe(enhance(dispatcher));
    },
    select
  };
}
