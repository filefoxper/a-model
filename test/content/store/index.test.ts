import { createKey, createStore } from '../../../src';

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

describe('通过createKey可以封装模型键', () => {
  test('通过createKey可以将模型函数封装成键', () => {
    const key = createKey(counter);
    expect(createKey.isModelKey(key)).toBe(true);
  });

  test('通过createKey的第二个参数让键携带默认状态', () => {
    const key = createKey(counter, 1);
    expect(key.createConnection().getInstance().count).toBe(1);
  });
});

describe('模型键的作用', () => {
  test('通过createStore可以把模型键作为模板创建出库', () => {
    const key = createKey(counter, 1);
    const store = createStore(key);
    const connection = store.find(key);
    if (connection == null) {
      throw new Error('不可能的错误');
    }
    const { count } = connection.getInstance();
    expect(count).toBe(1);
    store.destroy();
  });

  test('模型键本身就可以创建库', () => {
    const key = createKey(counter, 1);
    const store = key.createStore();
    const connection = store.get();
    if (connection == null) {
      throw new Error('不可能的错误');
    }
    const { count } = connection.getInstance();
    expect(count).toBe(1);
    store.destroy();
  });
});
