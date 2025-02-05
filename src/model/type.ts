import type { ConnectionKey, Connection } from '../connection/type';
import type { Config, ModelInstance, ValidInstance } from '../updater/type';

export interface ModelUsage<S, T extends ModelInstance> {
  (s: S): ValidInstance<S, T>;
  createKey: (state?: S) => ConnectionKey<S, T>;
  createConnection: (config?: Config<S>) => Connection<S, T>;
}
