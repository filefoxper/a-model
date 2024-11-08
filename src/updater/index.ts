import { createNotifier } from './notifier';
import { createTunnel, createUnInitializedUpdater, destroy } from './tunnel';
import type { Model, ModelInstance, Config, Updater } from './type';

function createInitializedUpdater<S, T extends ModelInstance>(
  updater: Updater<S, T>
) {
  return {
    notify: createNotifier(updater),
    createTunnel: createTunnel(updater)
  };
}

function createInitialize<S, T extends ModelInstance>(updater: Updater<S, T>) {
  return function initialize(args?: {
    stats?: { state: S };
    model?: Model<S, T>;
    config?: Config;
  }) {
    updater.mutate(u => {
      const model = args ? (args.model ?? u.model) : u.model;
      const state =
        args && !u.initialized
          ? args.stats
            ? args.stats.state
            : u.state
          : u.state;
      const config = args ? (args.config ?? u.config) : u.config;
      const nextConfig = { ...args?.config, ...config };
      if (
        Object.is(u.model, model) &&
        Object.is(u.state, state) &&
        u.initialized
      ) {
        return { ...u, initialized: true, config: nextConfig };
      }
      const instance = model(state);
      const initialized = createInitializedUpdater(u);
      return {
        ...u,
        model,
        state,
        initialized: true,
        instance,
        config: nextConfig,
        ...initialized
      };
    });
  };
}

function lazyModel(state: undefined) {
  return {};
}

export function createUpdater<S, T extends ModelInstance>(
  model: Model<S, T>,
  config: Config,
  defaultState?: S
): Updater<S, T> {
  const argLength = arguments.length;
  const hasDefaultState = argLength > 2;
  const { controlled } = config ?? {};
  const defaultInstance = hasDefaultState
    ? model(defaultState as S)
    : (lazyModel(undefined) as T);
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
      runEffects(result);
      if (updater === result) {
        return updater;
      }
      Object.assign(updater, result);
      return updater;
    },
    initialize: (args?: {
      stats?: { state: S };
      model?: Model<S, T>;
      config?: Config;
    }) => {},
    destroy() {
      destroy(updater, true);
    },
    ...unInitializedUpdater
  };
  const initialized = createInitializedUpdater(updater);
  Object.assign(updater, initialized, {
    initialize: createInitialize(updater)
  });
  return updater;
}
