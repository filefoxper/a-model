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
    createTunnel: (dispatcher: Dispatch) => ({
      connect: noop,
      disconnect: noop
    })
  };
}

export function destroy<S, T extends ModelInstance>(updater: Updater<S, T>) {
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
    const destroyed = createUnInitializedUpdater<S, T>();
    effect(() => {
      destroyDispatching();
    });
    return { ...u, ...destroyed, sidePayload: undefined, isDestroyed: true };
  });
}

export function generateTunnelCreator<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  function subscribe(dispatchFn: Dispatch) {
    const {
      dispatches,
      temporaryDispatches,
      controlled: isControlled
    } = updater;
    const copied = [...dispatches, ...temporaryDispatches];
    const exist = copied.some(d => d.dispatch === dispatchFn);
    if (exist) {
      return updater.mutate(u => ({ ...u, isDestroyed: false }));
    }
    const dispatcher = { dispatch: dispatchFn, accessible: true };
    if (isControlled) {
      return updater.mutate(u => ({
        ...u,
        dispatches: [dispatcher],
        isDestroyed: false
      }));
    }
    return updater.mutate((u, effect) => {
      const { temporaryDispatches: tds, dispatches: ds } = u;
      const nextTds = [...tds, dispatcher];
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
          td.dispatch(initializedAction);
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
  return function tunnel(dispatchFn: Dispatch) {
    function disconnect() {
      updater.mutate(u => {
        const { dispatches: ds, temporaryDispatches: tds } = u;
        const found = [...ds, ...tds].find(d => d.dispatch === dispatchFn);
        if (!found) {
          return u;
        }
        found.accessible = false;
        const nextDs = ds.filter(d => d !== found);
        const nextTds = tds.filter(d => d !== found);
        return {
          ...u,
          dispatches: nextDs,
          temporaryDispatches: nextTds
        };
      });
    }
    return {
      connect() {
        subscribe(dispatchFn);
      },
      disconnect() {
        disconnect();
      }
    };
  };
}
