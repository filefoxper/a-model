import { cacheIdentify, extractInstance } from '../instance';
import { shallowEqual } from '../../tools';
import type { Action, Dispatch, ModelInstance } from '../../updater/type';
import type { SignalStore, Store } from '../type';

export function createSignal<
  S,
  T extends ModelInstance,
  R extends (instance: () => T) => any = (instance: () => T) => T
>(store: Store<S, T, R>): SignalStore<S, T, R> {
  const signalStore: {
    collection: null | Record<string, any>;
    started: boolean;
    enabled: boolean;
  } = {
    collection: null,
    started: false,
    enabled: false
  };
  const enhance = (dispatcher?: Dispatch) => {
    return (action: Action) => {
      if (!signalStore.enabled) {
        dispatcher?.(action);
        return;
      }
      const { collection } = signalStore;
      if (collection == null) {
        dispatcher?.(action);
        return;
      }
      const current = extractInstance(store.updater);
      const keys = Object.keys(collection);
      const currentCollectionEntries = keys.map((key): [string, any] => {
        const field = current[key];
        if (cacheIdentify.field(field)) {
          return [key, field.get()];
        }
        return [key, field];
      });
      const currentCollection = Object.fromEntries(currentCollectionEntries);
      if (!shallowEqual(collection, currentCollection)) {
        dispatcher?.(action);
      }
    };
  };
  const { key: storeKey } = store;
  return {
    key: storeKey,
    getToken() {
      return store.getToken();
    },
    subscribe(dispatcher?: Dispatch): () => void {
      return store.subscribe(enhance(dispatcher));
    },
    getSignal() {
      const collectUsedFields = function collectUsedFields(
        key: string,
        val: any
      ) {
        if (!signalStore.started) {
          return;
        }
        signalStore.collection = signalStore.collection || {};
        signalStore.collection[key] = val;
      };
      const getInstance = function getInstance() {
        return extractInstance(store.updater, collectUsedFields);
      };
      const signal = function signal() {
        return getInstance();
      };
      signal.startStatistics = function startStatistics() {
        signalStore.started = true;
      };
      signal.stopStatistics = function stopStatistics() {
        signalStore.started = false;
      };
      signal.subscribe = function subscribe(dispatchCallback: Dispatch) {
        return store.subscribe(dispatchCallback);
      };
      signal.store = store;
      signalStore.enabled = true;
      signalStore.started = true;
      return signal;
    }
  };
}
