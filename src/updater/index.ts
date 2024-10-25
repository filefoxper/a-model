import { createNotifier } from './notifier';
import { createTunnel, createUnInitializedUpdater } from './tunnel';
import type { Model, ModelInstance, Config, Updater } from './type';

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
  const defaultInstance = model(defaultState);
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
