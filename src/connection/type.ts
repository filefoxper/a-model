import type {
  Config,
  Dispatch,
  Model,
  ModelInstance,
  Updater
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

export interface Connection<S, T extends ModelInstance> {
  updater: Updater<S, T>;
  createTunnel: (dispatcher: Dispatch) => {
    connect: () => void;
    disconnect: () => void;
    getInstance: () => T;
  };
  createSignal: (dispatcher: Dispatch) => {
    connect: () => void;
    disconnect: () => void;
    getSignal: () => {
      (): T;
      startStatistics: () => void;
      stopStatistics: () => void;
      getConnection: () => Connection<S, T>;
    };
  };
  getInstance: () => T;
  update: (args?: { model?: Model<S, T>; config?: Config<S> }) => void;
  destroy: () => void;
  payload: <R>(
    callback?: (payload: R | undefined) => R | undefined
  ) => R | undefined;
}

export interface ConnectionKey<
  S = any,
  T extends ModelInstance = any,
  M extends Model<S, T> = any
> {
  (s: S): T;
  source: M;
  createConnection: () => Connection<S, T>;
  createStore: () => { get: () => Connection<S, T>; destroy: () => void };
  modelKeyIdentifier: () => boolean;
}
