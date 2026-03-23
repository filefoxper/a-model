import { validations, config } from '../../../src';

const { createStore } = config();

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

describe('验证无状态模型实例', () => {
  test('如果不给createStore提供初始状态，则创建一个待初始化库', () => {
    const store = createStore(counter);
    const instance = store.getInstance();
    expect(validations.isInstanceFromNoStateModel(instance)).toBe(true);
  });

  test('通过使用库的 update 方法代入初始化状态，可以分离库的创建与初始化步骤', () => {
    const store = createStore(counter);
    store.update({ state: 0 });
    expect(validations.isInstanceFromNoStateModel(store.getInstance())).toBe(
      false
    );
  });

  test('如果待验证的实例为空，则验证失败', () => {
    expect(validations.isInstanceFromNoStateModel(null)).toBe(false);
  });

  test('如果待验证的实例类型不是对象，则验证失败', () => {
    expect(validations.isInstanceFromNoStateModel(1)).toBe(false);
  });
});

describe('验证对象是否为库', () => {
  test('如果被验证对象为库对象，返回为 true', () => {
    const store = createStore(counter);
    expect(validations.isModelStore(store)).toBe(true);
  });

  test('如被验证对象不为库对象，返回 false', () => {
    expect(validations.isModelStore({})).toBe(false);
  });
});

describe('验证当前获取的store版本是否为最新版本', () => {
  test('通过store.getToken()获取当前版本，通过token的isDifferent方法可以验证当前行为是否为最新行为', () => {
    const store = createStore(counter, 0);
    const startToken = store.getToken();
    const instance = store.getInstance();
    instance.increase();
    const endToken = store.getToken();
    expect(startToken.isDifferent(endToken)).toBe(true);
  });
});

describe('验证库是否已销毁', () => {
  test('通过 store.isDestroyed 方法可以检查库是否已销毁', () => {
    const store = createStore(counter, 0);
    store.destroy();
    expect(store.isDestroyed()).toBe(true);
  });
});
