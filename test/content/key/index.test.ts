import { config } from '../../../src';

const { createKey, createStores, model, createStore } = config();

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

describe('createKey', () => {
  test('使用createKey方法可创建模型键', () => {
    const key = createKey(counter);
    expect(createKey.isModelKey(key)).toBe(true);
  });

  test('使用createKey方法创建模型键，可带上默认初始状态值', () => {
    const key = createKey(counter, 1);
    expect(key.createStore().getInstance().count).toBe(1);
  });

  test('使用createKey方法创建模型键本身就可以创建库', () => {
    const key = createKey(counter, 1);
    const store = key.createStore();
    const { count } = store.getInstance();
    expect(count).toBe(1);
    store.destroy();
  });
});

describe('createStores', () => {
  test('使用createStores方法可以为多个模型键建立一个统一的库集合，每个模型键均可使用库集合的find方法，查找键对应的库', () => {
    const key = createKey(counter, 0);
    const store = createStore(counter, 0);
    const stores = createStores(key, store);
    const store0 = stores.find(key);
    store0?.getInstance().decrease();
    const store1 = stores.find(store);
    store1?.getInstance().increase();
    stores.destroy();
    expect([store0?.getInstance().count, store1?.getInstance().count]).toEqual([
      -1, 1
    ]);
  });

  test('使用createStores方法创建的库集合，可以使用update方法更新模型键', () => {
    const key0 = createKey(counter, 0);
    const key1 = createKey(counter, 0);
    const stores = createStores(key0, key1);
    const store0 = stores.find(key0);
    store0?.getInstance().decrease();
    const store1 = stores.find(key1);
    store1?.getInstance().increase();
    const resetModel = model((count: number) => ({
      ...counter(count),
      reset() {
        return 0;
      }
    }));
    const key2 = createKey(resetModel);
    const key3 = createKey(resetModel);
    stores.update(key2, key3);
    expect([
      stores.find(key2)?.getInstance().count,
      stores.find(key3)?.getInstance().count
    ]).toEqual([-1, 1]);
    stores.destroy();
  });
});
