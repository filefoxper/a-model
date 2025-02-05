import type { Connection, ConnectionKey } from '../connection/type';
import type { ModelInstance } from '../updater/type';

export interface Store {
  find: <S, T extends ModelInstance>(
    key: ConnectionKey<S, T>
  ) => Connection<S, T> | null;
  update: (...keys: ConnectionKey[]) => void;
  destroy: () => void;
}
