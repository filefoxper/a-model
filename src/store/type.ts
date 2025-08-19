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
  selector: R;
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

export interface ModelUsage<
  S,
  T extends ModelInstance,
  R extends (instance: () => T) => any = (instance: () => T) => T
> {
  (s: S): ValidInstance<S, T>;
  createKey: (state?: S) => ModelKey<S, T, R>;
  createStore: (state?: S) => Store<S, T, R>;
  select: <C extends (instance: () => T) => any = (instance: () => T) => T>(
    s: C
  ) => ModelUsage<S, T, C>;
  selector: R;
  modelUsageIdentifier: () => boolean;
  extends: <E extends Record<string, any>>(e: E) => ModelUsage<S, T, R> & E;
}

export interface Store<
  S = any,
  T extends ModelInstance = any,
  R extends (instance: () => T) => any = (instance: () => T) => T
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  updater: Updater<S, T>;
  getInstance: () => T;
  update: (args?: {
    model?: Model<S, T>;
    key?: Key<S, T, R>;
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

export interface SignalStore<
  S = any,
  T extends ModelInstance = any,
  R extends (instance: () => T) => any = (instance: () => T) => T
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  getSignal: () => {
    (): T;
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
