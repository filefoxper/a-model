import type {
  Action,
  Dispatch,
  Model,
  ModelInstance,
  Updater,
  ValidInstance
} from '../updater/type';

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

export interface Key<S = any, T extends ModelInstance = any>
  extends Model<S, T> {
  (s: S): ValidInstance<S, T>;
  source: Model<S, T>;
  modelKeyIdentifier: () => boolean;
  defaultState?: S;
  [k: string]: any;
}

export interface StoreIndex<S = any, T extends ModelInstance = any> {
  key: Key<S, T>;
}

export interface Store<S = any, T extends ModelInstance = any>
  extends StoreIndex<S, T> {
  subscribe: (dispatcher: Dispatch) => () => void;
  updater: Updater<S, T>;
  getInstance: () => T;
  update: (args?: { model?: Model<S, T>; initialState?: S; state?: S }) => void;
  destroy: () => void;
  payload: <R>(
    callback?: (payload: R | undefined) => R | undefined
  ) => R | undefined;
  isDestroyed: () => boolean;
}

export interface SignalStore<S = any, T extends ModelInstance = any>
  extends StoreIndex<S, T> {
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

export type MiddleWare = (next: Dispatch) => (action: Action) => void;
