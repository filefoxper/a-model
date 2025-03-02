declare interface ModelInstance {
  [key: string]: unknown;
  [key: number]: unknown;
}

declare type ValidInstance<S, T extends ModelInstance> = {
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

declare type Dispatch = (action: Action) => unknown;

export interface Key<S = any, T extends ModelInstance = any>
  extends Model<S, T> {
  (s: S): T;
  source: Model<S, T>;
  modelKeyIdentifier: () => boolean;
  [k: string]: any;
}

export interface Config {
  controlled?: boolean;
  batchNotify?: (
    listeners: ((action: Action) => void)[],
    action: Action
  ) => void;
}

/** createStore * */

export interface KeyWrapper<S = any, T extends ModelInstance = any> {
  key: Key<S, T>;
}

export interface Store<S = any, T extends ModelInstance = any>
  extends KeyWrapper<S, T> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getInstance: () => T;
  update: (args?: { model?: Model<S, T>; state?: S }) => void;
  destroy: () => void;
  payload: <R>(
    callback?: (payload: R | undefined) => R | undefined
  ) => R | undefined;
  isDestroyed: () => boolean;
}

export function createStore<S, T extends ModelInstance, D extends S>(
  model: Model<S, T> | Key<S, T>,
  state?: D
): Store<S, T>;

/** createKey * */

export interface ModelKey<S = any, T extends ModelInstance = any>
  extends Key<S, T> {
  (s: S): T;
  createStore: <D extends S>(state?: D) => Store<S, T>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface createKey {
  <S, T extends ModelInstance, D extends S>(
    model: Model<S, T>,
    state?: D
  ): ModelKey<S, T>;
  isModelKey: <S, T extends ModelInstance>(
    data: unknown
  ) => data is ModelKey<S, T>;
}

/** createStores * */

export interface StoreCollection {
  find: <S, T extends ModelInstance>(
    key: Key<S, T> | KeyWrapper<S, T>
  ) => Store<S, T> | null;
  update: (...keys: (ModelKey | KeyWrapper)[]) => void;
  destroy: () => void;
}

export function createStores(
  ...modelKeys: (ModelKey | KeyWrapper)[]
): StoreCollection;

/** model API * */

export interface ModelUsage<S, T extends ModelInstance> {
  (s: S): ValidInstance<S, T>;
  createKey: (state?: S) => ModelKey<S, T>;
  createStore: (state?: S) => Store<S, T>;
}

declare type FieldStructure<R = any> = {
  callback: () => R;
  deps: unknown[] | undefined;
  identifier: (d: unknown) => d is FieldStructure<R>;
  value: R;
  get: () => R;
};

declare type MethodStructure<
  R extends (...args: any[]) => any = (...args: any[]) => any
> = R & {
  identifier: (d: unknown) => d is MethodStructure;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface model {
  <S, T extends ModelInstance>(modelFn: Model<S, T>): ModelUsage<S, T>;
  createField: <R extends () => any>(
    callback: R,
    deps?: unknown[]
  ) => FieldStructure<ReturnType<R>>;
  createMethod: <R extends (...args: any[]) => any = (...args: any[]) => any>(
    method: R
  ) => MethodStructure<R>;
}

/** createSignal * */

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare interface SignalStore<S = any, T extends ModelInstance = any>
  extends KeyWrapper<S, T> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getSignal: () => {
    (): T;
    startStatistics: () => void;
    stopStatistics: () => void;
    subscribe: (dispatcher: Dispatch) => () => void;
    payload: <R>(
      callback?: (payload: R | undefined) => R | undefined
    ) => R | undefined;
  };
}

export declare function createSignal<S, T extends ModelInstance>(
  store: Store<S, T>
): SignalStore<S, T>;

/** config * */
export declare function config(configuration: Config): {
  createStore: typeof createStore;
  createKey: typeof createKey;
  createStores: typeof createStores;
  model: typeof model;
};
