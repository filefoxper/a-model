export interface ModelInstance {
  [key: string]: unknown;
  [key: number]: unknown;
}

export type ValidInstance<S, T extends ModelInstance> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => S
    ? T[K]
    : T[K] extends (...args: unknown[]) => unknown
      ? never
      : T[K];
};

export type Model<S, T extends ModelInstance> = (
  state: S
) => ValidInstance<S, T>;

export type Action<S = any, T extends ModelInstance = ModelInstance> = {
  type: null | string;
  method: null | ((...args: any[]) => any);
  params?: any[];
  state: S;
  prevState?: S;
  instance: T;
  prevInstance?: T;
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

export interface StateConfig<S, R extends (ins: any) => any = (ins: any) => any>
  extends Config {
  state?: S;
  selector?: R;
}

export type Updater<S, T extends ModelInstance> = {
  sidePayload: unknown | undefined;
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
    { value: any; getter: { get: () => any }; deps?: unknown[] } | null
  >;
  cacheMethods: Record<string, (...args: unknown[]) => unknown>;
  initialized: boolean;
  state: S;
  config: Config;
  payload: <P>(
    callback?: (payload: P | undefined) => P | undefined
  ) => P | undefined;
  update: (args?: { model?: Model<S, T>; initialState?: S; state?: S }) => void;
  notify: (action: Action | null) => void;
  mutate: (
    callback: (
      updater: Updater<S, T>,
      effect: (effectFn: (u: Updater<S, T>) => void) => void
    ) => Updater<S, T>
  ) => Updater<S, T>;
  createTunnel: (dispatcher: Dispatch) => {
    connect: () => void;
    disconnect: () => void;
  };
  destroy: () => void;
};
