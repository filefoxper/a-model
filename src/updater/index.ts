import { refreshInstance } from '../model';
import { noop } from '../tools';
import type { Model, ModelInstance } from '../model/type';
import type {
  Config,
  Updater,
  Action,
  ActionWrap,
  FirstActionWrap
} from './type';

function createNotifier<S, T extends ModelInstance>(updater: Updater<S, T>) {
  function pendAction(value: Action) {
    const { dispatching } = updater;
    if (!dispatching) {
      const wrap = { value } as FirstActionWrap;
      wrap.tail = wrap;
      updater.update({ dispatching: wrap });
      return;
    }
    const { tail } = dispatching;
    if (!tail) {
      return;
    }
    const current: ActionWrap = { prev: tail, value };
    tail.next = current;
    dispatching.tail = current;
    updater.update({ dispatching });
  }

  return function notify() {};
}

function createUpdater<S, T extends ModelInstance>(
  model: Model<S, T>,
  defaultState: S,
  config: Config
): Updater<S, T> {
  const { controlled, batchNotify } = config;
  const defaultInstance = refreshInstance<S, T>(model, defaultState);
  const updater = {
    version: 0,
    isDestroyed: false,
    model,
    instance: defaultInstance,
    dispatch: null,
    dispatches: [],
    temporaryDispatches: [],
    cacheMethods: {},
    cacheGenerators: {},
    state: defaultState,
    cacheState: null,
    controlled: !!controlled,
    notify: noop,
    isSubscribing: false,
    update(partition: Partial<Updater<S, T>>): Updater<S, T> {
      Object.assign(updater, partition);
      return updater;
    }
  };
  updater.notify = createNotifier(updater);
  return updater;
}
