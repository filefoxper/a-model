import { noop } from '../tools';
import type {
  Action,
  ActionWrap,
  Dispatch,
  ModelInstance,
  Updater
} from './type';

export function createUnInitializedUpdater<S, T extends ModelInstance>() {
  return {
    notify: (a: Action | null) => {},
    tunnel: (dispatcher: Dispatch) => ({
      connect: noop,
      disconnect: noop
    })
  };
}

export function createTunnel<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  function subscribe(dispatchFn: Dispatch) {
    const {
      dispatches,
      temporaryDispatches,
      controlled: isControlled
    } = updater;
    const copied = [...dispatches, ...temporaryDispatches];
    const exist = copied.indexOf(dispatchFn) >= 0;
    if (exist) {
      return updater.mutate(u => ({ ...u, isDestroyed: false }));
    }
    if (isControlled) {
      return updater.mutate(u => ({
        ...u,
        dispatches: [dispatchFn],
        isDestroyed: false
      }));
    }
    return updater.mutate((u, effect) => {
      const { temporaryDispatches: tds, dispatches: ds } = u;
      const nextTds = [...tds, dispatchFn];
      if (u.dispatching) {
        return {
          ...u,
          temporaryDispatches: nextTds,
          isDestroyed: false
        };
      }
      effect(up => {
        const initializedAction = {
          state: up.state,
          prevState: up.state,
          instance: up.instance,
          prevInstance: up.instance,
          type: null,
          method: null
        };
        nextTds.forEach(td => {
          td(initializedAction);
        });
      });
      return {
        ...u,
        temporaryDispatches: [],
        dispatches: [...ds, ...nextTds],
        isDestroyed: false
      };
    });
  }
  return function tunnel(dispatcher: Dispatch) {
    function disconnect() {
      updater.mutate(u => {
        const { dispatches: ds, temporaryDispatches: tds } = u;
        const nextDs = ds.filter(d => d !== dispatcher);
        const nextTds = tds.filter(d => d !== dispatcher);
        if (ds.length === nextDs.length && tds.length === nextTds.length) {
          return u;
        }
        return {
          ...u,
          dispatches: nextDs,
          temporaryDispatches: nextTds
        };
      });
    }
    function tryDestroy() {
      function destroyDispatching() {
        updater.mutate(u => {
          const { dispatching } = u;
          if (!dispatching) {
            return u;
          }
          let wrapper: ActionWrap | undefined = dispatching;
          while (wrapper) {
            const { next } = wrapper as ActionWrap;
            wrapper.next = undefined;
            wrapper.prev = undefined;
            if (next) {
              next.prev = undefined;
            }
            wrapper = next;
          }
          dispatching.tail = undefined;
          return { ...u, dispatching: undefined, initialized: false };
        });
      }
      updater.mutate((u, effect) => {
        const ds = [...u.dispatches, ...u.temporaryDispatches];
        if (ds.length) {
          return u;
        }
        const destroyed = createUnInitializedUpdater<S, T>();
        effect(() => {
          destroyDispatching();
        });
        return { ...u, ...destroyed, isDestroyed: true };
      });
    }
    return {
      connect() {
        subscribe(dispatcher);
      },
      disconnect() {
        disconnect();
        tryDestroy();
      }
    };
  };
}
