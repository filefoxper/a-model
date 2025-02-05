import { model } from '../../../src';

describe('模型方法model是常用API的集成点', () => {
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

  test('model方法可直接创建connection', () => {
    const { getInstance } = model(counter).createConnection({ state: 0 });
    const { increase } = getInstance();
    increase();
    expect(getInstance().count).toBe(1);
  });

  test('model方法可以直接创建模型键', () => {
    const key = model(counter).createKey(0);
    const store = key.createStore();
    const { getInstance } = store.get();
    const { increase } = getInstance();
    increase();
    expect(getInstance().count).toBe(1);
    store.destroy();
  });

  test('model方法创建库', () => {
    const store = model(counter).createKey(0).createStore();
    const { getInstance } = store.get();
    const { increase } = getInstance();
    increase();
    expect(getInstance().count).toBe(1);
    store.destroy();
  });
});

describe('model.createField', () => {
  const counter = function counter(state: number) {
    const symbol = !state ? '' : state < 0 ? '-' : '+';
    return {
      count: state,
      symbol,
      info: model.createField(() => ({ symbol })),
      cacheInfo: model.createField(() => ({ symbol }), [symbol]),
      increase() {
        return state + 1;
      },
      decrease() {
        return state - 1;
      }
    };
  };

  test('通过 model.createField 创建的字段，只能通过字段的 get 方法获取值', () => {
    const { info } = model(counter)
      .createConnection({ state: 0 })
      .getInstance();
    const { symbol } = info.get();
    expect(symbol).toBe('');
  });

  test('通过 model.createField 创建的字段的 get 方法获取的值保持最新', () => {
    const symbols: string[] = [];
    const { info, increase } = model(counter)
      .createConnection({ state: 0 })
      .getInstance();
    symbols.push(info.get().symbol);
    increase();
    symbols.push(info.get().symbol);
    expect(symbols).toEqual(['', '+']);
  });

  test('通过 model.createField 在无缓存依赖的环境下创建的字段无缓存效应', () => {
    const symbols: any[] = [];
    const { info, increase } = model(counter)
      .createConnection({ state: 1 })
      .getInstance();
    symbols.push(info.get());
    increase();
    symbols.push(info.get());
    expect(symbols[0]).not.toBe(symbols[1]);
  });

  test('通过 model.createField 在有缓存依赖的环境下创建的字段值根据缓存依赖决定是否获取缓存值', () => {
    const symbols: any[] = [];
    const { cacheInfo, increase } = model(counter)
      .createConnection({ state: 1 })
      .getInstance();
    symbols.push(cacheInfo.get());
    increase();
    symbols.push(cacheInfo.get());
    expect(symbols[0]).toBe(symbols[1]);
  });
});
