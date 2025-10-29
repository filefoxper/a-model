import { cacheIdentify, extractInstance } from '../instance';
import type { SignalOptions, SignalStore, Store } from '../type';
import type { Action, Dispatch, ModelInstance } from '../../updater/type';

export function createSignal<
  S,
  T extends ModelInstance,
  R extends (instance: () => T) => any = (instance: () => T) => T
>(store: Store<S, T, R>): SignalStore<S, T, R> {
  const signalStore: {
    collection: Record<string, any>;
    started: boolean;
    enabled: boolean;
  } = {
    collection: {},
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
        return;
      }
      const storeInstance = extractInstance(store.updater);
      const keys = Object.keys(collection);
      if (!keys.length) {
        return;
      }
      const hasChange = keys.some(key => {
        const field = storeInstance[key];
        const collectedField = collection[key];
        if (cacheIdentify.field(field) && cacheIdentify.field(collectedField)) {
          return field.get() !== collectedField.get();
        }
        return field !== collectedField;
      });
      if (hasChange) {
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
        signalStore.collection[key] = val;
      };
      const getInstance = function getInstance(options?: SignalOptions) {
        const { cutOff } = options ?? {};
        return extractInstance(
          store.updater,
          cutOff ? undefined : collectUsedFields
        );
      };
      const signal = function signal(options?: SignalOptions) {
        return getInstance(options);
      };
      signal.startStatistics = function startStatistics() {
        signalStore.started = true;
        signalStore.collection = {};
      };
      signal.stopStatistics = function stopStatistics() {
        signalStore.started = false;
        signalStore.collection = {};
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
