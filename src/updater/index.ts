import { createNoStateModel } from '../validation';
import { generateNotifier } from './notifier';
import {
  generateTunnelCreator,
  createUnInitializedUpdater,
  destroy
} from './tunnel';
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
      const initialState =
        'initialState' in args ? (args.initialState as S) : u.state;
      const state = 'state' in args ? (args.state as S) : u.state;
      if (u.controlled) {
        const instance = model(state);
        return { ...u, state, instance, model };
      }
      if (u.isDestroyed) {
        return u;
      }
      if (!u.initialized && !('initialState' in args)) {
        throw new Error('Should update initialState first.');
      }
      if (!u.initialized) {
        const instance = model(initialState);
        const initializedUpdater = createInitializedUpdater(u, middleWare);
        return {
          ...u,
          model,
          state: initialState,
          instance,
          initialized: true,
          ...initializedUpdater
        };
      }
      if (Object.is(u.model, model) && Object.is(u.state, state)) {
        return u;
      }
      const instance = model(state);
      effect(up => {
        up.notify({
          type: null,
          method: null,
          prevInstance: u.instance,
          instance,
          prevState: u.state,
          state
        });
      });
      return {
        ...u,
        state,
        model,
        instance,
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
