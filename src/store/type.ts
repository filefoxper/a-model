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

export interface Store<S, T extends ModelInstance> {
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
      getStore: () => Store<S, T>;
    };
  };
  getInstance: () => T;
  initialize: (args?: {
    stats?: { state: S };
    model?: Model<S, T>;
    config?: Config;
  }) => void;
  payload: <R>(
    callback?: (payload: R | undefined) => R | undefined
  ) => R | undefined;
}
