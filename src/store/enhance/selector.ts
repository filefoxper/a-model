import type { Action, Dispatch, ModelInstance } from '../../updater/type';
import type { SelectorOption, Store } from '../type';

export function createSelector<
  S,
  T extends ModelInstance,
  R extends undefined | ((instance: () => T) => any) = undefined
>(store: Store<S, T, R>, opts?: SelectorOption) {
  const { equality } = opts ?? {};
  const selectStore: {
    selectedInstance: any;
  } = {
    selectedInstance: store.getInstance()
  };
  const cache: {
    selector?: (
      instance: () => R extends undefined
        ? T
        : ReturnType<R extends undefined ? never : R>
    ) => any;
    equality?: (c: any, n: any) => boolean;
    setSelect: (
      selector:
        | ((
            instance: () => R extends undefined
              ? T
              : ReturnType<R extends undefined ? never : R>
          ) => any)
        | undefined
    ) => void;
  } = {
    equality,
    setSelect(
      selector:
        | ((
            instance: () => R extends undefined
              ? T
              : ReturnType<R extends undefined ? never : R>
          ) => any)
        | undefined
    ) {
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
    getInstance: () => R extends undefined
      ? T
      : ReturnType<R extends undefined ? never : R>
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

  function select(): R extends undefined
    ? T
    : ReturnType<R extends undefined ? never : R>;
  function select<
    C extends (
      instance: () => R extends undefined
        ? T
        : ReturnType<R extends undefined ? never : R>
    ) => any
  >(selector: C): ReturnType<C>;
  function select<
    C extends (
      instance: () => R extends undefined
        ? T
        : ReturnType<R extends undefined ? never : R>
    ) => any
  >(
    selector?: C
  ):
    | (R extends undefined ? T : ReturnType<R extends undefined ? never : R>)
    | ReturnType<C> {
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
