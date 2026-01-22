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

export declare type Model<S = any, T extends ModelInstance = any> = (
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
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> extends M {
  (s: PickState<M>): Instance<M>;
  source: M;
  wrapper: R;
  modelKeyIdentifier: () => boolean;
  [k: string]: any;
  defaultState?: PickState<M>;
}

declare interface UpdaterStore<S = any, T extends ModelInstance = any> {
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
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = any
> {
  key: Key<M, R>;
}

export declare interface Store<
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> extends StoreIndex<M, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getToken: () => Token;
  getInstance: () => R extends undefined
    ? Instance<M>
    : ReturnType<R extends undefined ? never : R>;
  getStoreInstance: () => Instance<M>;
  update: (args?: {
    model?: M;
    key?: Key<M, R>;
    initialState?: PickState<M>;
    state?: PickState<M>;
  }) => void;
  destroy: () => void;
  payload: <P>(
    callback?: (payload: P | undefined) => P | undefined
  ) => P | undefined;
  isDestroyed: () => boolean;
  extends: <E extends Record<string, any>>(e: E) => Store<M, R> & E;
}

export declare function createStore<
  M extends Model,
  D extends PickState<M>,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
>(model: M | Key<M, R> | ModelUsage<M, R>, state?: D): Store<M, R>;

/** createKey * */

export declare interface ModelKey<
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> extends Key<M, R> {
  (s: PickState<M>): Instance<M>;
  createStore: <D extends PickState<M>>(initialState?: D) => Store<M, R>;
  extends: <E extends Record<string, any>>(e: E) => ModelKey<M, R> & E;
}

export declare function createKey<
  M extends Model = any,
  D extends PickState<M>,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
>(model: M | ModelUsage<M, R>, initialState?: D): ModelKey<M, R>;

/** createStores * */

export declare interface StoreCollection {
  find: <
    M extends Model = any,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    key: Key<M, R> | StoreIndex<M, R>
  ) => Store<M, R> | null;
  update: (...keys: (ModelKey<any, any> | StoreIndex<any, any>)[]) => void;
  keys: () => Key[];
  destroy: () => void;
}

export declare function createStores(
  ...modelKeys: (ModelKey<any, any> | StoreIndex<any, any>)[]
): StoreCollection;

/** model API * */

export declare type ModelUsage<
  M extends Model,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> = M & {
  createKey: <D extends PickState<M>>(state?: D) => ModelKey<M, R>;
  createStore: <D extends PickState<M>>(state?: D) => Store<M, R>;
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
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> extends StoreIndex<M, R> {
  getToken: () => Token;
  subscribe: (dispatcher: Dispatch) => () => void;
  getSignal: () => {
    (
      options?: SignalOptions
    ): R extends undefined
      ? Instance<M>
      : ReturnType<R extends undefined ? never : R>;
    startStatistics: () => void;
    stopStatistics: () => void;
    subscribe: (dispatcher: Dispatch) => () => void;
    store: Store<M, R>;
  };
}

export declare function createSignal<
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
>(store: Store<M, R>): SignalStore<M, R>;

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
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> extends StoreIndex<M, R> {
  getToken: () => Token;
  subscribe: (dispatcher: Dispatch) => () => void;
  select: SelectMethod<Instance<M>, R>;
}

declare interface SelectorOption<T = any> {
  equality?: (current: T, next: T) => boolean;
}

export declare function createSelector<
  M extends Model = any,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
>(store: Store<M, R>, opts?: SelectorOption): SelectorStore<M, R>;

/** config * */
export declare function config(configuration: Config): {
  createStore: <
    M extends Model,
    D extends PickState<M>,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    modelLike: M | Key<M, R> | ModelUsage<M, R>,
    state?: D
  ) => Store<M, R>;
  createKey: <
    M extends Model,
    D extends PickState<M>,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    modelLike: M | ModelUsage<M, R>,
    state?: D
  ) => ModelKey<M, R>;
  createStores: (...modelKeys: (ModelKey | StoreIndex)[]) => StoreCollection;
  model: model;
};

/** validations * */
export declare const validations: {
  isInstanceFromNoStateModel: (instance: any) => boolean;
  isModelKey: <
    M extends Model,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    data: any
  ) => data is ModelKey<M, R>;
  isModelStore: <
    M extends Model,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    data: any
  ) => data is Store<M, R>;
  isModelUsage: <
    M extends Model,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    data: M
  ) => data is ModelUsage<typeof data, R>;
  isStoreIndex: <
    M extends Model,
    R extends undefined | ((instance: () => Instance<M>) => any) = undefined
  >(
    data: any
  ) => data is StoreIndex<M, R>;
};

/** tools * */
export declare function shallowEqual(prev: any, current: any): boolean;
