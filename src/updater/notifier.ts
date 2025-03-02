import type {
  Action,
  ActionWrap,
  Dispatch,
  FirstActionWrap,
  Updater,
  ModelInstance
} from './type';

function defaultNotifyImplement(dispatches: Dispatch[], action: Action) {
  dispatches.forEach(callback => {
    callback(action);
  });
}

export function generateNotifier<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  function pendAction(value: Action) {
    updater.mutate(u => {
      const { dispatching } = u;
      if (!dispatching) {
        const wrap = { value } as FirstActionWrap;
        wrap.tail = wrap;
        return { ...u, dispatching: wrap };
      }
      const { tail } = dispatching;
      if (!tail) {
        return u;
      }
      const current: ActionWrap = { prev: tail, value };
      tail.next = current;
      dispatching.tail = current;
      return { ...u, dispatching };
    });
  }

  function unshiftAction() {
    return updater.mutate(u => {
      const { dispatching } = updater;
      if (!dispatching) {
        return u;
      }
      const { next, tail } = dispatching;
      if (tail === dispatching || !next) {
        dispatching.tail = undefined;
        return { ...u, dispatching: undefined };
      }
      next.prev = undefined;
      const newFirst = next as FirstActionWrap;
      newFirst.tail = tail;
      return { ...u, dispatching: newFirst };
    }).dispatching;
  }

  function consumeTemporaries() {
    const { temporaryDispatches } = updater;
    updater.mutate(u =>
      u.temporaryDispatches.length
        ? {
            ...u,
            dispatches: [...u.dispatches, ...u.temporaryDispatches],
            temporaryDispatches: []
          }
        : u
    );
    const initializedAction = {
      state: updater.state,
      prevState: updater.state,
      instance: updater.instance,
      prevInstance: updater.instance,
      type: null,
      method: null
    };
    temporaryDispatches.forEach(call => {
      call(initializedAction);
    });
  }

  const { config } = updater;

  return function notify(action: Action | null) {
    if (action == null) {
      return;
    }
    const { dispatching } = updater;
    pendAction(action);
    if (dispatching) {
      return;
    }
    while (updater.dispatching) {
      const wrap = updater.dispatching;
      if (wrap) {
        const { dispatches } = updater;
        const dispatchCallbacks = [...dispatches];
        try {
          if (
            typeof config.batchNotify === 'function' &&
            dispatchCallbacks.length
          ) {
            config.batchNotify(dispatchCallbacks, wrap.value);
          } else {
            defaultNotifyImplement(dispatchCallbacks, wrap.value);
          }
        } catch (e) {
          updater.mutate(u => ({ ...u, dispatching: undefined }));
          throw e;
        }
        unshiftAction();
      } else {
        updater.mutate(u => ({ ...u, dispatching: undefined }));
      }
    }
    consumeTemporaries();
  };
}
