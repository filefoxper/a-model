import type {
  Dispatch,
  Model,
  ModelInstance,
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
}

export interface Store<
  S = any,
  T extends ModelInstance = any,
  R extends (instance: () => T) => any = (instance: () => T) => T
> extends StoreIndex<S, T, R> {
  subscribe: (dispatcher: Dispatch) => () => void;
  updater: Updater<S, T>;
  getInstance: () => T;
  update: (args?: { model?: Model<S, T>; initialState?: S; state?: S }) => void;
  destroy: () => void;
  payload: <P>(
    callback?: (payload: P | undefined) => P | undefined
  ) => P | undefined;
  isDestroyed: () => boolean;
  modelStoreIdentifier: () => boolean;
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
    payload: <P>(
      callback?: (payload: P | undefined) => P | undefined
    ) => P | undefined;
  };
}

export interface SelectorOption<T = any> {
  equality?: (current: T, next: T) => boolean;
}
