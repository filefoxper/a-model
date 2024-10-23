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
    action: Action,
    listeners: ((action: Action) => void)[]
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
  cacheGenerators: Record<
    string,
    { value: any; deps?: unknown[]; out: { get: () => any } } | null
  >;
  cacheMethods: Record<string, (...args: unknown[]) => unknown>;
  cacheState: { state: S } | null;
  state: S;
  notify: (action: Action | null) => void;
  update: (partition: Partial<Updater<S, T>>) => Updater<S, T>;
};
