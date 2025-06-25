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

describe('当环境中没有Proxy构造函数时', () => {
  const P = global.Proxy;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.Proxy = undefined;
  });

  afterEach(() => {
    global.Proxy = P;
  });

  test('系统应该正常运行', () => {
    const { getInstance } = model(counter).createStore(0);
    getInstance().decrease();
    expect(getInstance().count).toBe(-1);
  });

  test('直接给实例对象属性赋值将抛异常', () => {
    const { getInstance } = model(counter).createStore(0);
    expect(() => {
      getInstance().count = 1;
    }).toThrow();
  });
});
