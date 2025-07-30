import {
  validations,
  config,
  createSignal,
  model,
  createSelector
} from '../../../src';
import { noop } from '../../../src/tools';

const { createKey, createStore } = config();

const counter = function counter(state: number) {
  return {
    count: state,
    symbol: !state ? '' : state < 0 ? '-' : '+',
    increase() {
      return state + 1;
    },
    decrease() {
      return state - 1;
    }
  };
};

describe('使用 createStore 创建状态库', () => {
  test('使用 createStore 可以为模型创建一个库', () => {
    const store = createStore(counter, 0);
    const instance = store.getInstance();
    expect(instance.symbol).toEqual('');
  });

  test('使用 createStore 可以为模型键创建一个库', () => {
    const key = createKey(counter);
    const store = createStore(key, 0);
    const initializedInstance = store.getInstance();
    initializedInstance.increase();
    expect(store.getInstance().symbol).not.toEqual(initializedInstance.symbol);
  });

  test('通过模型键建立的库，可以获取模型键的默认值为默认值', () => {
    const key = createKey(counter, 1);
    const store = createStore(key);
    const initializedInstance = store.getInstance();
    initializedInstance.increase();
    expect(store.getInstance().count).toBe(2);
  });

  test('使用库的payload方法可为库附加额外数据', () => {
    const records: string[] = [];
    const store = createStore(counter, 0);
    const unsubscribe = store.subscribe(a => {
      if (a.type == null) {
        return;
      }
      records.push(a.type);
    });
    store.payload(() => records);
    expect(store.payload() as string[]).toBe(records);
    unsubscribe();
  });

  describe('通过库的 getInstance 方法获取实例对象', () => {
    test('如果不给createStore提供初始状态，则可以获取一个未初始化实例', () => {
      const store = createStore(counter);
      const instance = store.getInstance();
      expect(validations.isInstanceFromNoStateModel(instance)).toEqual(true);
    });

    test('直接使用未初始化实例所提供的行为方法，会导致异常', () => {
      const store = createStore(counter);
      const instance = store.getInstance();
      expect(() => instance.increase()).toThrow();
    });

    test('通过使用库的 update 方法可对未初始化的库进行初始化处理，并得到一个已初始化的实例', () => {
      const store = createStore(counter);
      store.update({ initialState: 0 });
      expect(
        validations.isInstanceFromNoStateModel(store.getInstance())
      ).toEqual(false);
    });

    test('调用已初始化实例的方法，可更新状态刷新实例', () => {
      const store = createStore(counter, 0);
      const initializedInstance = store.getInstance();
      initializedInstance.increase();
      expect(store.getInstance().symbol).not.toEqual(
        initializedInstance.symbol
      );
    });

    test('库实例不允许人工修改，给实例对象的属性赋值，会引起报错', () => {
      const store = createStore(counter, 0);
      const initializedInstance = store.getInstance();
      expect(() => {
        initializedInstance.count = 1;
      }).toThrow();
    });
  });

  describe('使用库的createTunnel方法可创建通道，用于监听库状态的更新情况', () => {
    test('当使用通道的connect方法启动通道时，库的监听者数量会加1', () => {
      const store = createStore(counter, 0);
      const unsubscribe = store.subscribe(noop);
      expect(store.updater.dispatches.length).toEqual(1);
      unsubscribe();
    });

    test('当使用通道的connect方法启动通道时，监听函数可以接收到一个用于同步库状态的链接行为', () => {
      const store = createStore(counter, 0);
      const actionRecords: { type: null | string; state: unknown }[] = [];
      const unsubscribe = store.subscribe(action =>
        actionRecords.push({ type: action.type, state: action.state })
      );
      expect(actionRecords).toEqual([{ type: null, state: 0 }]);
      unsubscribe();
    });

    test('当使用通道实例所提供的行为方法时，监听函数可以监听到当前发生的行为', () => {
      const store = createStore(counter, 0);
      const actionRecords: { type: null | string; state: unknown }[] = [];
      const unsubscribe = store.subscribe(action =>
        actionRecords.push({ type: action.type, state: action.state })
      );
      store.getInstance().increase();
      expect(actionRecords).toEqual([
        { type: null, state: 0 },
        { type: 'increase', state: 1 }
      ]);
      unsubscribe();
    });

    test('通道监听函数总是原子运行的，在监听函数一次运行结束前，不可能再次嵌套运行监听函数', () => {
      const store = createStore(counter, 0);
      const actionTypeRecords: ('start' | 'end')[] = [];
      const unsubscribe = store.subscribe(action => {
        if (action.type == null) {
          return;
        }
        actionTypeRecords.push('start');
        (function processDispatch() {
          if (action.type !== 'increase') {
            return;
          }
          store.getInstance().decrease();
        })();
        actionTypeRecords.push('end');
      });
      store.getInstance().increase();
      unsubscribe();
      expect(actionTypeRecords).toEqual(['start', 'end', 'start', 'end']);
    });

    test('通道监听函数按原子性运行的特性源于行为栈，在监听函数执行完毕前，行为栈不为空', () => {
      const store = createStore(counter, 0);
      const unsubscribe = store.subscribe(action => {
        if (action.type == null) {
          return;
        }
        expect(store.updater.dispatching).not.toBeUndefined();
      });
      store.getInstance().increase();
      unsubscribe();
    });

    test('当使用通道的disconnect方法时，通道会移除当的前监听函数', () => {
      const store = createStore(counter, 0);
      const actionRecords = [];
      const unsubscribe = store.subscribe(action => actionRecords.push(action));
      unsubscribe();
      expect(store.updater.dispatches.length).toEqual(0);
    });

    test('当库进入已销毁状态，正在执行的库行为栈会被强制清空', () => {
      const store = createStore(counter, 0);
      store.subscribe(action => {
        if (action.type == null) {
          return;
        }
        store.destroy();
        expect(store.updater.dispatching).toBeUndefined();
      });
      store.getInstance().increase();
    });

    test('当库进入已销毁状态，库状态不会被清理', () => {
      const store = createStore(counter, 0);
      const unsubscribe = store.subscribe(noop);
      store.getInstance().increase();
      unsubscribe();
      expect(store.getInstance().count).toBe(1);
    });

    test('当库进入已销毁状态，后续行为不会被执行', () => {
      const store = createStore(counter, 0);
      store.subscribe(noop);
      store.destroy();
      store.getInstance().increase();
      expect(store.getInstance().count).toBe(0);
    });
  });

  describe('使用 createSignal 方法可创建信号同步点', () => {
    test('当信号同步点所产生的实例字段在行为发生前后均被访问，且值发生了变更，信号点会将行为通知到监听函数', () => {
      const actions: string[] = [];
      const store = createStore(counter, 0);
      const { subscribe, getSignal } = createSignal(store);
      const unsubscribe = subscribe(action => {
        if (!action.type) {
          return;
        }
        actions.push(action.type);
      });
      const signal = getSignal();
      const { symbol: s, increase } = signal();
      increase();
      const { symbol: s1 } = signal();
      increase();
      const { symbol: s2 } = signal();
      increase();
      expect(actions.length).toBe(1);
      unsubscribe();
    });

    test('当使用信号同步点的stopStatistics方法时，信号点停止对比实例字段，并随行为的产生通知到监听函数，可通过再次使用startStatistics方法进行恢复', () => {
      const actions: string[] = [];
      const store = createStore(counter, 0);
      const { subscribe, getSignal } = createSignal(store);
      const unsubscribe = subscribe(action => {
        if (!action.type) {
          return;
        }
        actions.push(action.type);
      });
      const signal = getSignal();
      signal.stopStatistics();
      const { count: c, increase } = signal();
      increase();
      signal.startStatistics();
      const { symbol: s } = signal();
      increase();
      const { symbol: s1 } = signal();
      increase();
      signal.stopStatistics();
      const { count: c1 } = signal();
      increase();
      expect(actions.length).toBe(1);
      unsubscribe();
    });
  });

  describe('使用 createSelector 方法可创建一个实例重选同步点', () => {
    test('当实例重选同步点的 select 方法没有使用自定义 selector 函数作参数时，默认使用通过 model API 设置的 selector 函数', async () => {
      const store = model(counter)
        .select(getInstance => {
          const instance = getInstance();
          return {
            ...instance,
            async increase() {
              await Promise.resolve();
              getInstance().increase();
            },
            async decrease() {
              await Promise.resolve();
              getInstance().decrease();
            }
          };
        })
        .createStore(0);
      const actions: string[] = [];
      const { subscribe, select } = createSelector(store);
      const unsubscribe = subscribe(action => {
        if (!action.type) {
          return;
        }
        actions.push(action.type);
      });
      const { increase } = select();
      const promise = increase();
      const { count: increaseBeforeCount } = select();
      await promise;
      const { count: increaseAfterCount } = select();
      expect([increaseBeforeCount, increaseAfterCount]).toEqual([0, 1]);
      unsubscribe();
    });

    test('当实例重选同步点的 select 方法使用了自定义 selector 函数，则应该返回该函数的重选结果', () => {
      const store = model(counter).createStore(0);
      const actions: string[] = [];
      const { subscribe, select } = createSelector(store);
      const unsubscribe = subscribe(action => {
        if (!action.type) {
          return;
        }
        actions.push(action.type);
      });
      const increase = select(getInstance => {
        return getInstance().increase;
      });
      increase();
      const count = select(getInstance => getInstance().count);
      expect(count).toEqual(1);
      unsubscribe();
    });

    test('当实例重选同步点的 select 方法使用了自定义的 equality 函数时，返回结果是否更新由 equality 对比值是否相等决定', async () => {
      const store = model(counter)
        .select(getInstance => {
          const instance = getInstance();
          return {
            ...instance,
            async increase() {
              await Promise.resolve();
              getInstance().increase();
            },
            async decrease() {
              await Promise.resolve();
              getInstance().decrease();
            }
          };
        })
        .createStore(0);
      const actions: string[] = [];
      const { subscribe, select } = createSelector(store, {
        equality: () => true
      });
      const unsubscribe = subscribe(action => {
        if (!action.type) {
          return;
        }
        actions.push(action.type);
      });
      const { increase } = select();
      const promise = increase();
      await promise;
      expect(actions.length).toBe(0);
      unsubscribe();
    });
  });

  describe('建立单通道的受控库', () => {
    test('通过设置 controlled 字段，建立受控库', () => {
      const configState = { state: 0 };
      const store = config({ controlled: true }).createStore(
        counter,
        configState.state
      );
      const unsubscribe = store.subscribe(action => {
        configState.state = action.state;
      });
      store.getInstance().increase();
      const staleCount = store.getInstance().count;
      store.update({ state: configState.state });
      expect([staleCount, store.getInstance().count]).toEqual([
        0,
        configState.state
      ]);
      unsubscribe();
    });
  });
});
