import type {
  Dispatch,
  Instance,
  Model,
  ModelInstance,
  PickState,
  Token,
  Updater,
  ValidInstance
} from '../updater/type';
import type { ModelKey } from '../key/type';

export type FieldStructure<R = any> = {
  callback: () => R;
  deps: unknown[] | undefined;
  identifier: (d: unknown) => d is FieldStructure<R>;
  value: R;
  get: () => R;
};

export type MethodStructure<
  R extends (...args: any[]) => any = (...args: any[]) => any
> = R & {
  identifier: (d: unknown) => d is MethodStructure;
};

export interface InstanceCache<
  T extends Record<string, any> = Record<string, any>
> {
  target: T;
  cacheFields: Record<
    string,
    { value: any; getter: { get: () => any }; deps?: unknown[] } | null
  >;
  cacheMethods: Record<string, (...args: unknown[]) => unknown>;
}

export interface Key<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends Model<S, T> {
  (s: S): ValidInstance<S, T>;
  source: Model<S, T>;
  wrapper: R;
  modelKeyIdentifier: () => boolean;
  defaultState?: S;
  [k: string]: any;
}

export interface StoreIndex<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> {
  key: Key<S, T, R>;
}

export type ModelUsage<
  M extends Model,
  R extends undefined | ((instance: () => Instance<M>) => any) = undefined
> = M & {
  createKey: (state?: PickState<M>) => ModelKey<PickState<M>, Instance<M>, R>;
  createStore: (state?: PickState<M>) => Store<PickState<M>, Instance<M>, R>;
  produce: <
    C extends (instance: () => Instance<M>) => any = (
      instance: () => Instance<M>
    ) => Instance<M>
  >(
    s: C
  ) => ModelUsage<M, C>;
  wrapper: R;
  modelUsageIdentifier: () => boolean;
  extends: <E extends Record<string, any>>(e: E) => ModelUsage<M, R> & E;
};

export interface Store<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher?: Dispatch) => () => void;
  updater: Updater<S, T>;
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
  modelStoreIdentifier: () => boolean;
  getToken: () => Token;
  extends: <E extends Record<string, any>>(e: E) => Store<S, T, R> & E;
}

export interface SignalOptions {
  cutOff?: boolean;
}

export interface SignalStore<
  S = any,
  T extends ModelInstance = any,
  R extends undefined | ((instance: () => T) => any) = undefined
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getSignal: () => {
    (options?: SignalOptions): T;
    startStatistics: () => void;
    stopStatistics: () => void;
    subscribe: (dispatcher: Dispatch) => () => void;
    store: Store<S, T, R>;
  };
  getToken: () => Token;
}

export interface SelectorOption<T = any> {
  equality?: (current: T, next: T) => boolean;
}
