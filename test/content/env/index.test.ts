import { config } from '../../../src';

const { model } = config();

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

describe('极端环境测试', () => {
  test('当环境中没有Proxy构造函数时，系统应该正常运行', () => {
    const P = global.Proxy;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.Proxy = undefined;
    const { getInstance } = model(counter).createStore(0);
    getInstance().decrease();
    expect(getInstance().count).toBe(-1);
    global.Proxy = P;
  });
});
