import { simpleErrorProcess } from '../tools';
import type {
  Action,
  ActionWrap,
  Dispatch,
  FirstActionWrap,
  Updater,
  ModelInstance,
  MiddleWare
} from './type';

function defaultNotifyImplement(dispatches: Dispatch[], action: Action) {
  dispatches.forEach(callback => {
    callback(action);
  });
}

export function generateNotifier<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  middleWare: MiddleWare
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

  const dispatch = function dispatch(action: Action) {
    const { dispatches, controlled, model, config } = updater;
    const { state } = action;
    const nextInstance = model(state) as T;
    const nextAction = { ...action, instance: nextInstance };
    if (!controlled) {
      updater.mutate(u => ({
        ...u,
        state,
        instance: nextInstance,
        version: u.version + 1
      }));
    }
    const notifyAction = function notifyAction(act: Action) {
      const errors: any[] = [];
      const dispatchCallbacks = dispatches.map(simpleErrorProcess(errors));
      defaultNotifyImplement(dispatchCallbacks, act);
      if (!errors.length) {
        return { errors: undefined };
      }
      return { errors };
    };
    const notifyActionWithErrorThrow = function notifyActionWithErrorThrow(
      act: Action
    ) {
      const { errors } = notifyAction(act);
      if (!errors || !errors.length) {
        return;
      }
      throw errors[0];
    };
    try {
      if (typeof config.notify === 'function') {
        config.notify(notifyAction, nextAction);
      } else {
        notifyActionWithErrorThrow(nextAction);
      }
    } catch (e) {
      updater.mutate(u => ({ ...u, dispatching: undefined }));
      throw e;
    }
  };

  return function notify(action: Action | null) {
    if (action == null || updater.isDestroyed) {
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
        middleWare({
          getState() {
            return { state: updater.state, instance: updater.instance };
          },
          dispatch: notify
        })(dispatch)(wrap.value);
        unshiftAction();
      } else {
        updater.mutate(u => ({ ...u, dispatching: undefined }));
      }
    }
    consumeTemporaries();
  };
}
