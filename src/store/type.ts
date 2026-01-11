import type {
  Dispatch,
  Model,
  ModelInstance,
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
  R extends (instance: () => T) => any = (instance: () => T) => T
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
  R extends (instance: () => T) => any = (instance: () => T) => T
> {
  key: Key<S, T, R>;
}

export type ModelUsage<
  S,
  T extends ModelInstance,
  M extends Model<S, T>,
  R extends (instance: () => T) => any = (instance: () => T) => T
> = M & {
  createKey: (state?: S) => ModelKey<S, T, R>;
  createStore: (state?: S) => Store<S, T, R>;
  produce: <C extends (instance: () => T) => any = (instance: () => T) => T>(
    s: C
  ) => ModelUsage<S, T, M, C>;
  wrapper: R;
  modelUsageIdentifier: () => boolean;
  extends: <E extends Record<string, any>>(e: E) => ModelUsage<S, T, M, R> & E;
};

export interface Store<
  S = any,
  T extends ModelInstance = any,
  R extends (instance: () => T) => any = (instance: () => T) => T
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher?: Dispatch) => () => void;
  updater: Updater<S, T>;
  getInstance: () => ReturnType<R>;
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
  R extends (instance: () => T) => any = (instance: () => T) => T
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
