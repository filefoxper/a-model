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

function createUpdateFn<S, T extends ModelInstance>(updater: Updater<S, T>) {
  return function update(args?: { model?: Model<S, T>; config?: Config<S> }) {
    updater.mutate((u, effect): Updater<S, T> => {
      const model = args ? (args.model ?? u.model) : u.model;
      const sourceConfig = args?.config;
      const config = sourceConfig || {};
      const state = 'state' in config ? (config.state as S) : u.state;
      if (u.isDestroyed) {
        return u;
      }
      const nextConfig = sourceConfig ? { ...u.config, ...config } : u.config;
      if (!u.initialized) {
        const instance = model(state);
        const initializedUpdater = createInitializedUpdater(u);
        return {
          ...u,
          model,
          state,
          instance,
          config: nextConfig,
          initialized: true,
          ...initializedUpdater
        };
      }
      if (Object.is(u.model, model)) {
        return sourceConfig ? { ...u, config: nextConfig } : u;
      }
      const instance = model(u.state);
      effect(up => {
        up.notify({
          type: null,
          method: null,
          prevInstance: u.instance,
          instance,
          prevState: u.state,
          state: u.state
        });
      });
      return {
        ...u,
        model,
        instance,
        config: nextConfig,
        initialized: true
      };
    });
  };
}

function lazyModel(state: undefined) {
  return {};
}

export function createUpdater<S, T extends ModelInstance>(
  model: Model<S, T>,
  config: Config<S> = {}
): Updater<S, T> {
  const hasDefaultState = 'defaultState' in config;
  const { controlled, state: defaultState } = config;
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
    update: (args?: { model?: Model<S, T>; config?: Config<S> }) => {},
    destroy() {
      destroy(updater, true);
    },
    ...unInitializedUpdater
  };
  const initialized = createInitializedUpdater(updater);
  Object.assign(updater, initialized, {
    update: createUpdateFn(updater)
  });
  return updater;
}
