// eslint-disable-next-line import/no-unresolved
import { create, validations } from '@test/../src/index';
import { noop } from '../../../src/tools';

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

describe('通过create创建基本模型实例', () => {
  test('当create接收一个初始state状态时，可以创建一个用于管理模型实例的connection对象', () => {
    const connection = create(counter, { state: 0 });
    const instance = connection.getInstance();
    expect(instance.symbol).toEqual('');
  });

  test('当create没有接收到任何初始state状态时，可创建一个无状态用于懒初始化的connection对象', () => {
    const connection = create(counter);
    const instance = connection.getInstance();
    expect(validations.isInstanceFromNoStateModel(instance)).toEqual(true);
  });

  test('向无状态懒初始化connection对象更新状态值，可将其转化为正常有状态connection对象', () => {
    const connection = create(counter);
    connection.update({ config: { state: 0 } });
    expect(
      validations.isInstanceFromNoStateModel(connection.getInstance())
    ).toEqual(false);
  });

  test('一个正常状态的connection对象，可以通过调用实例方法更新状态及实例对象', () => {
    const connection = create(counter, { state: 0 });
    const initializedInstance = connection.getInstance();
    initializedInstance.increase();
    expect(connection.getInstance().symbol).not.toEqual(
      initializedInstance.symbol
    );
  });

  test('根据模型的行为方法，可以简单预测出模型实例在行为发生后的状态变更，如：increase 导致 count 值从 o 变为 1', () => {
    const connection = create(counter, { state: 0 });
    const initializedInstance = connection.getInstance();
    initializedInstance.increase();
    expect([initializedInstance.count, connection.getInstance().count]).toEqual(
      [0, 1]
    );
  });

  test('通过payload方法可以为库对象增加额外辅助数据，该数据同样可以通过payload方法在任何可以访问到链接的地方提取', () => {
    const records: string[] = [];
    const connection = create(counter, { state: 0 });
    const tunnel = connection.createTunnel(a => {
      if (a.type == null) {
        return;
      }
      records.push(a.type);
    });
    tunnel.connect();
    const { increase } = tunnel.getInstance();
    connection.payload(d => records);
    increase();
    expect(connection.payload() as string[]).toBe(records);
    tunnel.disconnect();
  });
});

describe('通过tunnel创建模型信号管道', () => {
  test('通过tunnel.connect接口可以监听行为的发生', () => {
    const connection = create(counter, { state: 0 });
    const actionRecords = [];
    const { connect, disconnect } = connection.createTunnel(action =>
      actionRecords.push(action)
    );
    connect();
    connection.getInstance().increase();
    expect(actionRecords.length).not.toEqual(0);
    disconnect();
  });

  test('tunnel.connect接口在调用瞬间会向connection的监听列表中添加监听函数', () => {
    const connection = create(counter, { state: 0 });
    const actionRecords = [];
    const { connect, disconnect } = connection.createTunnel(action =>
      actionRecords.push(action)
    );
    connect();
    expect(connection.updater.dispatches.length).toEqual(1);
    disconnect();
  });

  test('tunnel.connect接口在调用时会立即触发当前注入的监听函数，以同步当前最新实例对象和状态值', () => {
    const connection = create(counter, { state: 0 });
    const actionRecords = [];
    const { connect, disconnect } = connection.createTunnel(action =>
      actionRecords.push(action)
    );
    connect();
    expect(actionRecords.length).not.toEqual(0);
    disconnect();
  });

  test('tunnel通过监听函数发布行为的过程中产生的其他行为发布请求，会在当前监听函数执行完毕后顺序发布', () => {
    const connection = create(counter, { state: 0 });
    const actionTypeRecords: string[] = [];
    const { connect, disconnect } = connection.createTunnel(action => {
      if (action.type == null) {
        return;
      }
      (function processDispatch() {
        if (action.type !== 'increase') {
          return;
        }
        connection.getInstance().decrease();
      })();
      actionTypeRecords.push(action.type);
    });
    connect();
    connection.getInstance().increase();
    disconnect();
    expect(actionTypeRecords).toEqual(['increase', 'decrease']);
  });

  test('tunnel发布行为来源于栈，当发布未结束时，行为栈不为空', () => {
    const connection = create(counter, { state: 0 });
    const { connect, disconnect } = connection.createTunnel(action => {
      if (action.type == null) {
        return;
      }
      expect(connection.updater.dispatching).not.toBe(undefined);
    });
    connect();
    connection.getInstance().increase();
    disconnect();
  });

  test('tunnel.disconnect接口会移除当前监听回调函数', () => {
    const connection = create(counter, { state: 0 });
    const actionRecords = [];
    const { connect, disconnect } = connection.createTunnel(action =>
      actionRecords.push(action)
    );
    connect();
    disconnect();
    expect(connection.updater.dispatches.length).toEqual(0);
  });

  test('tunnel.disconnect接口会在移除最后一个监听函数后，将connection设置为destroyed状态', () => {
    const connection = create(counter, { state: 0 });
    const actionRecords = [];
    const { connect, disconnect } = connection.createTunnel(action =>
      actionRecords.push(action)
    );
    connect();
    disconnect();
    expect(connection.updater.isDestroyed).toEqual(true);
  });

  test('tunnel.disconnect接口会在移除最后一个监听函数后，将当前正在执行的行为栈强制清空', () => {
    const connection = create(counter, { state: 0 });
    const { connect, disconnect, getInstance } = connection.createTunnel(
      action => {
        if (action.type == null) {
          return;
        }
        disconnect();
        expect(connection.updater.dispatching).toBeUndefined();
      }
    );
    connect();
    getInstance().increase();
  });
});

describe('通过signal创建模型信号节点', () => {
  test('signal模型信号节点，通过统计行为发生前后被访问的实例字段是否发生改变来决定是否触发监听函数，我们称之为信号优化算法', () => {
    const actions: string[] = [];
    const { connect, disconnect, getSignal } = create(counter, {
      state: 0
    }).createSignal(action => {
      if (!action.type) {
        return;
      }
      actions.push(action.type);
    });
    connect();
    const signal = getSignal();
    const { symbol: s, increase } = signal();
    increase();
    const { symbol: s1 } = signal();
    increase();
    const { symbol: s2 } = signal();
    increase();
    expect(actions.length).toBe(1);
    disconnect();
  });

  test('signal模型信号生成函数的 getConnection 方法，可以额外获取模型信号与库之间链接对象', () => {
    const actions: string[] = [];
    const { connect, disconnect, getSignal } = create(counter, {
      state: 0
    }).createSignal(noop);
    const signal = getSignal();
    const connection = signal.getConnection();
    const tunnel = connection.createTunnel(action => {
      if (action.type == null) {
        return;
      }
      actions.push(action.type);
    });
    connect();
    tunnel.connect();
    const { symbol: s, increase } = signal();
    increase();
    const { symbol: s1 } = signal();
    increase();
    const { symbol: s2 } = signal();
    increase();
    expect(actions.length).toBe(3);
    tunnel.disconnect();
    disconnect();
  });

  test('signal模型信号生成函数的优化算法可以通过 startStatistics 和 stopStatistics 方法进行人工优化', () => {
    const actions: string[] = [];
    const { connect, disconnect, getSignal } = create(counter, {
      state: 0
    }).createSignal(action => {
      if (!action.type) {
        return;
      }
      actions.push(action.type);
    });
    connect();
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
    disconnect();
  });
});
