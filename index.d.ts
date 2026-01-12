declare interface ModelInstance {
  [key: string]: any;
  [key: number]: any;
}

export declare type FieldStructure<R = any> = {
  callback: () => R;
  deps: any[] | undefined;
  identifier: (d: any) => d is FieldStructure<R>;
  value: R;
  get: () => R;
};

export declare type MethodStructure<
  R extends (...args: any[]) => any = (...args: any[]) => any
> = R & {
  identifier: (d: any) => d is MethodStructure;
};

declare type ValidInstance<S, T extends ModelInstance> = {
  [K in keyof T]: T[K] extends
    | ((...args: any[]) => S)
    | (((...args: any[]) => any) & { identifier: (d: any) => boolean })
    ? T[K]
    : T[K] extends (...args: any[]) => any
      ? never
      : T[K];
};

export declare type Model<S = any, T extends ModelInstance = ModelInstance> = (
  state: S
) => ValidInstance<S, T>;

export type PickState<R extends Model> = R extends (state: infer S) => any
  ? S
  : never;

export type Instance<R extends Model> = R extends (state: any) => infer T
  ? T
  : never;

export declare type Action<S = any, T extends ModelInstance = ModelInstance> = {
  type: null | string;
  method: null | ((...args: any[]) => any);
  params?: any[];
  state: S;
  prevState?: S;
  instance: T;
  prevInstance?: T;
};

export interface Token {
  isDifferent: (token: Token) => boolean;
  value: unknown;
}

export declare type Dispatch = (action: Action) => any;

export declare interface Key<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends Model<S, T> {
  (s: S): T;
  source: Model<S, T>;
  wrapper: R;
  modelKeyIdentifier: () => boolean;
  [k: string]: any;
  defaultState?: S;
}

declare interface UpdaterStore<
  S = any,
  T extends ModelInstance = ModelInstance
> {
  getState: () => { state: S; instance: T };
  dispatch: (action: Action) => void;
}

export declare type MiddleWare = (
  store: UpdaterStore
) => (next: Dispatch) => (action: Action) => void;

export declare interface Config {
  middleWares?: MiddleWare[];
  controlled?: boolean;
  notify?: (
    notifier: (action: Action) => { errors: any[] | undefined },
    action: Action
  ) => any;
}

/** createStore * */

export declare interface StoreIndex<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> {
  key: Key<S, T, R>;
}

export declare interface Store<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getToken: () => Token;
  getInstance: () => R extends undefined
    ? T
    : ReturnType<R extends undefined ? never : R>;
  getStoreInstance: () => T;
  update: (args?: {
    model?: Model<S, T>;
    key?: Key<S, T, R>;
    initialState?: S;
    state?: S;
  }) => void;
  destroy: () => void;
  payload: <P>(
    callback?: (payload: P | undefined) => P | undefined
  ) => P | undefined;
  isDestroyed: () => boolean;
  extends: <E extends Record<string, any>>(e: E) => Store<S, T, R> & E;
}

export declare function createStore<
  S,
  T extends ModelInstance,
  D extends S,
  R extends undefined | ((instance: () => T) => any) = undefined
>(
  model: Model<S, T> | Key<S, T, R> | ModelUsage<Model<S, T>, R>,
  state?: D
): Store<S, T, R>;

/** createKey * */

export declare interface ModelKey<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends Key<S, T, R> {
  (s: S): T;
  createStore: <D extends S>(state?: D) => Store<S, T, R>;
  extends: <E extends Record<string, any>>(e: E) => ModelKey<S, T, R> & E;
}

export declare function createKey<
  S,
  T extends ModelInstance,
  D extends S,
  R extends undefined | ((instance: () => T) => any) = undefined
>(
  model: Model<S, T> | ModelUsage<Model<S, T>, R>,
  state?: D
): ModelKey<S, T, R>;

/** createStores * */

export declare interface StoreCollection {
  find: <
    S,
    T extends ModelInstance,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    key: Key<S, T, R> | StoreIndex<S, T, R>
  ) => Store<S, T, R> | null;
  update: (
    ...keys: (ModelKey<any, any, any> | StoreIndex<any, any, any>)[]
  ) => void;
  keys: () => Key[];
  destroy: () => void;
}

export declare function createStores(
  ...modelKeys: (ModelKey<any, any, any> | StoreIndex<any, any, any>)[]
): StoreCollection;

/** model API * */

export declare type ModelUsage<
  M extends Model,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> = M & {
  createKey: <D extends PickState<M>>(
    state?: D
  ) => ModelKey<PickState<M>, Instance<M>, R>;
  createStore: <D extends PickState<M>>(
    state?: D
  ) => Store<PickState<M>, Instance<M>, R>;
  produce: <
    C extends (instance: () => Instance<M>) => any = (
      instance: () => Instance<M>
    ) => Instance<M>
  >(
    s: C
  ) => ModelUsage<M, C>;
  wrapper: R;
  extends: <E extends Record<string, any>>(e: E) => ModelUsage<M, R> & E;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export declare interface model {
  <M extends Model>(modelFn: M): ModelUsage<M, undefined>;
  <M extends Model, R extends (instance: () => Instance<M>) => any>(
    modelFn: M,
    s: R
  ): ModelUsage<M, R>;
  <
    M extends Model,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    modelFn: M,
    s?: R
  ): ModelUsage<M, R>;
  createField: <P extends () => any>(
    callback: P,
    deps?: any[]
  ) => FieldStructure<ReturnType<P>>;
  createMethod: <P extends (...args: any[]) => any = (...args: any[]) => any>(
    method: P
  ) => MethodStructure<P>;
}

/** createSignal * */

export interface SignalOptions {
  cutOff?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare interface SignalStore<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends StoreIndex<S, T, R> {
  getToken: () => Token;
  subscribe: (dispatcher: Dispatch) => () => void;
  getSignal: () => {
    (
      options?: SignalOptions
    ): R extends undefined ? T : ReturnType<R extends undefined ? never : R>;
    startStatistics: () => void;
    stopStatistics: () => void;
    subscribe: (dispatcher: Dispatch) => () => void;
    store: Store<S, T, R>;
  };
}

export declare function createSignal<
  S,
  T extends ModelInstance,
  R extends undefined | ((instance: () => T) => any) = undefined
>(store: Store<S, T, R>): SignalStore<S, T, R>;

/** createSelector * */

declare type SelectMethod<
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> = {
  (): R extends undefined ? T : ReturnType<R extends undefined ? never : R>;
  <
    C extends (
      instance: () => R extends undefined
        ? T
        : ReturnType<R extends undefined ? never : R>
    ) => any
  >(
    selector: C
  ): ReturnType<C>;
  <
    C extends (
      instance: () => R extends undefined
        ? T
        : ReturnType<R extends undefined ? never : R>
    ) => any
  >(
    selector?: C
  ):
    | (R extends undefined ? T : ReturnType<R extends undefined ? never : R>)
    | ReturnType<C>;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare interface SelectorStore<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends StoreIndex<S, T, R> {
  getToken: () => Token;
  subscribe: (dispatcher: Dispatch) => () => void;
  select: SelectMethod<T, R>;
}

declare interface SelectorOption<T = any> {
  equality?: (current: T, next: T) => boolean;
}

export declare function createSelector<
  S,
  T extends ModelInstance,
  R extends undefined | ((instance: () => T) => any) = undefined
>(store: Store<S, T, R>, opts?: SelectorOption): SelectorStore<S, T, R>;

/** config * */
export declare function config(configuration: Config): {
  createStore: <
    S,
    T extends ModelInstance,
    D extends S,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    model: Model<S, T> | Key<S, T, R> | ModelUsage<Model<S, T>, R>,
    state?: D
  ) => Store<S, T, R>;
  createKey: <
    S,
    T extends ModelInstance,
    D extends S,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    model: Model<S, T> | ModelUsage<Model<S, T>, R>,
    state?: D
  ) => ModelKey<S, T, R>;
  createStores: (...modelKeys: (ModelKey | StoreIndex)[]) => StoreCollection;
  model: model;
};

/** validations * */
export declare const validations: {
  isInstanceFromNoStateModel: (instance: any) => boolean;
  isModelKey: <
    S,
    T extends ModelInstance,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    data: any
  ) => data is ModelKey<S, T, R>;
  isModelStore: <
    S,
    T extends ModelInstance,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    data: any
  ) => data is Store<S, T, R>;
  isModelUsage: <
    M extends Model,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    data: M
  ) => data is ModelUsage<typeof data, R>;
  isStoreIndex: <
    S,
    T extends ModelInstance,
    R extends undefined | ((instance: () => T) => any) = undefined
  >(
    data: any
  ) => data is StoreIndex<S, T, R>;
};

/** tools * */
export declare function shallowEqual(prev: any, current: any): boolean;
