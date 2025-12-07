import type { Action, Dispatch, ModelInstance } from '../../updater/type';
import type { SelectorOption, Store } from '../type';

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
    selector?: (instance: () => ReturnType<R>) => any;
    equality?: (c: any, n: any) => boolean;
    setSelect: (
      selector: ((instance: () => ReturnType<R>) => any) | undefined
    ) => void;
  } = {
    equality,
    setSelect(selector: ((instance: () => ReturnType<R>) => any) | undefined) {
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

  const generateSelectedInstance = function generateSelectedInstance(
    getInstance: () => ReturnType<R>
  ): any {
    if (cache.selector) {
      return cache.selector(getInstance);
    }
    return getInstance();
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
  function select<C extends (instance: () => ReturnType<R>) => any>(
    selector: C
  ): ReturnType<C>;
  function select<C extends (instance: () => ReturnType<R>) => any>(
    selector?: C
  ): ReturnType<R> | ReturnType<C> {
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
