import type { Model, ModelInstance } from '../model/type';

export type Action = {
  type: null | string;
  method: null | ((...args: any[]) => any);
  params?: any[];
  state: any;
  prevState?: any;
  instance: any;
  prevInstance?: any;
};

export type Dispatch = (action: Action) => unknown;

export interface ActionWrap {
  prev?: ActionWrap;
  value: Action;
  next?: ActionWrap;
}

export interface FirstActionWrap extends ActionWrap {
  tail: ActionWrap | undefined;
}

export interface Config {
  controlled?: boolean;
  batchNotify?: (
    listeners: ((action: Action) => void)[],
    action: Action
  ) => void;
}

export type Updater<S, T extends ModelInstance> = {
  version: number;
  isDestroyed: boolean;
  isSubscribing: boolean;
  dispatching?: FirstActionWrap;
  instance: T;
  controlled: boolean;
  model: Model<S, T>;
  dispatch: Dispatch | null;
  dispatches: Dispatch[];
  temporaryDispatches: Dispatch[];
  cacheFields: Record<
    string,
    { value: any; deps?: unknown[]; out: { get: () => any } } | null
  >;
  cacheMethods: Record<string, (...args: unknown[]) => unknown>;
  initialized: boolean;
  state: S;
  config: Config;
  initialize: (args?: { stats?: { state: S }; model?: Model<S, T> }) => void;
  notify: (action: Action | null) => void;
  mutate: (
    callback: (
      updater: Updater<S, T>,
      effect: (effectFn: (u: Updater<S, T>) => void) => void
    ) => Updater<S, T>
  ) => Updater<S, T>;
  tunnel: (dispatcher: Dispatch) => {
    connect: () => void;
    disconnect: () => void;
  };
};
