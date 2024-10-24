import { refreshInstance } from '../model';
import { noop } from '../tools';
import type { Model, ModelInstance } from '../model/type';
import type {
  Config,
  Updater,
  Action,
  ActionWrap,
  FirstActionWrap,
  Dispatch
} from './type';

function createUnInitializedUpdater<S, T extends ModelInstance>() {
  return {
    notify: (a: Action | null) => {},
    tunnel: (dispatcher: Dispatch) => ({
      connect: noop,
      disconnect: noop
    })
  };
}

function defaultNotifyImplement(dispatches: Dispatch[], action: Action) {
  dispatches.forEach(callback => {
    callback(action);
  });
}

function createNotifier<S, T extends ModelInstance>(updater: Updater<S, T>) {
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

function createTunnel<S, T extends ModelInstance>(updater: Updater<S, T>) {
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

function createInitializedUpdater<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  return {
    notify: createNotifier(updater),
    tunnel: createTunnel(updater)
  };
}

function createInitialize<S, T extends ModelInstance>(updater: Updater<S, T>) {
  return function initialize(args?: {
    stats?: { state: S };
    model?: Model<S, T>;
  }) {
    updater.mutate(u => {
      const model = args ? (args.model ?? u.model) : u.model;
      const state = args ? (args.stats ? args.stats.state : u.state) : u.state;
      if (Object.is(u.model, model) && Object.is(u.state, state)) {
        return { ...u, initialized: true };
      }
      const instance = model(state);
      const initialized = createInitializedUpdater(u);
      return {
        ...u,
        model,
        state,
        initialized: true,
        instance,
        ...initialized
      };
    });
  };
}

export function createUpdater<S, T extends ModelInstance>(
  model: Model<S, T>,
  defaultState: S,
  config: Config
): Updater<S, T> {
  const { controlled } = config;
  const defaultInstance = refreshInstance<S, T>(model, defaultState);
  const unInitializedUpdater = createUnInitializedUpdater<S, T>();
  const updater: Updater<S, T> = {
    version: 0,
    isDestroyed: false,
    model,
    instance: defaultInstance,
    dispatch: null,
    dispatches: [],
    temporaryDispatches: [],
    cacheMethods: {},
    cacheFields: {},
    state: defaultState,
    initialized: false,
    controlled: !!controlled,
    isSubscribing: false,
    config,
    mutate(
      callback: (
        updater: Updater<S, T>,
        effect: (effectFn: (u: Updater<S, T>) => void) => void
      ) => Updater<S, T>
    ): Updater<S, T> {
      const effects: ((u: Updater<S, T>) => void)[] = [];
      const runEffects = function runEffects(u: Updater<S, T>) {
        effects.forEach(e => e(u));
      };
      const result = callback(updater, (effectFn: (u: Updater<S, T>) => void) =>
        effects.push(effectFn)
      );
      runEffects(result);
      if (updater === result) {
        return updater;
      }
      Object.assign(updater, result);
      return updater;
    },
    initialize: (args?: { stats?: { state: S }; model?: Model<S, T> }) => {},
    ...unInitializedUpdater
  };
  const initialized = createInitializedUpdater(updater);
  Object.assign(updater, initialized, {
    initialize: createInitialize(updater)
  });
  return updater;
}
