import { validations, createStore } from '../../../src';

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
    store.update({ initialState: 0 });
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
