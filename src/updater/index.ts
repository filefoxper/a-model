import { createNoStateModel } from '../validation';
import { generateNotifier } from './notifier';
import {
  generateTunnelCreator,
  createUnInitializedUpdater,
  destroy
} from './tunnel';
import { createToken } from './token';
import type {
  Model,
  ModelInstance,
  Updater,
  StateConfig,
  MiddleWare
} from './type';

function createInitializedUpdater<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  middleWare: MiddleWare
) {
  const createTunnel = generateTunnelCreator(updater);
  return {
    notify: generateNotifier(updater, middleWare),
    createTunnel
  };
}

function createUpdateFn<S, T extends ModelInstance>(
  updater: Updater<S, T>,
  middleWare: MiddleWare
) {
  return function update(
    args: { model?: Model<S, T>; initialState?: S; state?: S } = {}
  ) {
    updater.mutate((u, effect): Updater<S, T> => {
      const model = args.model ?? u.model;
      const hasState = Object.prototype.hasOwnProperty.call(args, 'state');
      const hasInitialState = Object.prototype.hasOwnProperty.call(
        args,
        'initialState'
      );
      const state = hasState ? (args.state as S) : u.state;
      const isInitialize = !u.initialized || hasInitialState;
      const token = createToken();
      if (u.controlled) {
        const instance = model(state);
        return { ...u, state, instance, model };
      }
      if (u.isDestroyed) {
        return u;
      }
      if (!u.initialized && !('state' in args)) {
        throw new Error(
          'The updater has not been initialized, it should be updated with a state for initializing.'
        );
      }
      if (isInitialize) {
        const initialState = hasInitialState ? (args.initialState as S) : state;
        const instance = model(initialState);
        const initializedUpdater = createInitializedUpdater(u, middleWare);
        return {
          ...u,
          model,
          state,
          instance,
          initialized: true,
          token,
          ...initializedUpdater
        };
      }
      if (Object.is(u.model, model) && Object.is(u.state, state)) {
        return u;
      }
      effect(up => {
        up.notify({
          type: null,
          method: null,
          prevInstance: u.instance,
          instance: u.instance,
          prevState: u.state,
          state
        });
      });
      return {
        ...u,
        model,
        initialized: true,
        cacheFields: {},
        cacheMethods: {}
      };
    });
  };
}

const lazyModel = createNoStateModel();

export function createUpdater<S, T extends ModelInstance>(
  model: Model<S, T>,
  middleWare: MiddleWare,
  config: StateConfig<S> = {}
): Updater<S, T> {
  const hasDefaultState = 'state' in config;
  const { controlled, state: defaultState } = config;
  const defaultInstance = hasDefaultState
    ? model(defaultState as S)
    : (lazyModel(undefined) as unknown as T);
  const unInitializedUpdater = createUnInitializedUpdater<S, T>();
  const updater: Updater<S, T> = {
    sidePayload: undefined,
    version: 0,
    token: createToken(),
    isDestroyed: false,
    model,
    instance: defaultInstance,
    dispatch: null,
    dispatches: [],
    temporaryDispatches: [],
    cacheMethods: {},
    cacheFields: {},
    state: defaultState as S,
    initialized: hasDefaultState,
    controlled: !!controlled,
    isSubscribing: false,
    config,
    payload<R>(
      setter?: (payload: R | undefined) => R | undefined
    ): R | undefined {
      if (typeof setter === 'function') {
        updater.sidePayload = setter(updater.sidePayload as R);
      }
      return updater.sidePayload as R | undefined;
    },
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
      if (updater === result) {
        runEffects(result);
        return updater;
      }
      Object.assign(updater, result);
      runEffects(updater);
      return updater;
    },
    update: (args?: { model?: Model<S, T>; state?: S; initialState?: S }) => {},
    destroy() {
      destroy(updater);
    },
    ...unInitializedUpdater
  };
  const initialized = createInitializedUpdater(updater, middleWare);
  Object.assign(updater, initialized, {
    update: createUpdateFn(updater, middleWare)
  });
  return updater;
}
