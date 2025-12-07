import { config } from '../../../src';

const { model } = config();

describe('model', () => {
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

  test('使用model API，可直接创建库', () => {
    const { getInstance } = model(counter).createStore(0);
    const { increase } = getInstance();
    increase();
    expect(getInstance().count).toBe(1);
  });

  test('使用model API，可直接创建模型键', () => {
    const key = model(counter).createKey(0);
    const { getInstance, destroy } = key.createStore();
    const { increase } = getInstance();
    increase();
    expect(getInstance().count).toBe(1);
    destroy();
  });

  test('使用model API，可为创建的库添加默认实例重选组合方案', async () => {
    const store = model(counter)
      .pipe(getInstance => {
        return {
          ...getInstance(),
          async delayIncrease() {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(getInstance().increase());
              }, 200);
            });
          }
        };
      })
      .createStore(0);
    const { subscribe, getInstance } = store;
    const unsubscribe = subscribe(() => undefined);
    await getInstance().delayIncrease();
    expect(getInstance().count).toBe(1);
    unsubscribe();
  });

  test('使用model API，可为创建的键添加默认实例重选组合方案', async () => {
    const key = model(counter)
      .pipe(getInstance => {
        return {
          ...getInstance(),
          async delayIncrease() {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(getInstance().increase());
              }, 200);
            });
          }
        };
      })
      .createKey(0);
    const store = key.createStore();
    const { subscribe, getInstance } = store;
    const unsubscribe = subscribe();
    await getInstance().delayIncrease();
    expect(getInstance().count).toBe(1);
    unsubscribe();
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
      },
      sum: model.createMethod((...params: number[]) => {
        return params.reduce((r, c) => r + c, state);
      })
    };
  };

  test('使用 model.createField 创建的字段，只能通过它的 get 方法获取值', () => {
    const { info } = model(counter).createStore(0).getInstance();
    const { symbol } = info.get();
    expect(symbol).toBe('');
  });

  test('使用 model.createField 创建的字段，使用其 get 方法获取的值保持最新', () => {
    const symbols: string[] = [];
    const { info, increase } = model(counter).createStore(0).getInstance();
    symbols.push(info.get().symbol);
    increase();
    symbols.push(info.get().symbol);
    expect(symbols).toEqual(['', '+']);
  });

  test('使用 model.createField 创建的字段，若无依赖项，则其get方法获取的值始终保持最新', () => {
    const symbols: any[] = [];
    const { info, increase } = model(counter).createStore(2).getInstance();
    symbols.push(info.get());
    increase();
    symbols.push(info.get());
    expect(symbols[0]).not.toBe(symbols[1]);
  });

  test('使用 model.createField 创建的字段，若依赖了缓存列表，则其get值根据依赖项进行缓存', () => {
    const symbols: any[] = [];
    const { cacheInfo, decrease } = model(counter).createStore(2).getInstance();
    symbols.push(cacheInfo.get());
    decrease();
    symbols.push(cacheInfo.get());
    decrease();
    symbols.push(cacheInfo.get());
    expect(symbols[0]).toBe(symbols[1]);
  });

  test('使用 model.createMethod 可以创建一个不会改变状态的非行为方法', () => {
    const store = model(counter).createStore(1);
    const { increase, sum } = store.getInstance();
    increase();
    const result = sum(1, 2);
    expect(store.getInstance().count).not.toBe(result);
  });

  test('使用 model.createField 创建的字段，可运用于默认实例重选组合方案', () => {
    const store = model(counter)
      .pipe(getInstance => {
        return {
          selectedInfo: model.createField(() => ({
            symbol: getInstance().symbol
          })),
          ...getInstance()
        };
      })
      .createStore(0);
    const { subscribe, getInstance } = store;
    const unsubscribe = subscribe();
    getInstance().decrease();
    expect(getInstance().selectedInfo.get().symbol).toBe('-');
    unsubscribe();
  });

  test('默认实例重选组合方案中的字段可以使用实例对象提供的属性数据作为缓存依赖', () => {
    const symbols: any[] = [];
    const store = model(counter)
      .pipe(getInstance => {
        return {
          selectedInfo: model.createField(
            () => ({
              symbol: getInstance().symbol
            }),
            [getInstance().symbol]
          ),
          ...getInstance()
        };
      })
      .createStore(0);
    const { subscribe, getInstance } = store;
    const unsubscribe = subscribe();
    symbols.push(getInstance().selectedInfo.get());
    getInstance().decrease();
    symbols.push(getInstance().selectedInfo.get());
    getInstance().decrease();
    symbols.push(getInstance().selectedInfo.get());
    expect(symbols[1]).toBe(symbols[2]);
    unsubscribe();
  });

  test('默认实例重选组合方案中的字段可以使用实例对象提供的字段作为缓存依赖', () => {
    const symbols: any[] = [];
    const store = model(counter)
      .pipe(getInstance => {
        return {
          selectedInfo: model.createField(
            () => ({
              symbol: getInstance().cacheInfo.get().symbol
            }),
            [getInstance().cacheInfo]
          ),
          ...getInstance()
        };
      })
      .createStore(0);
    const { subscribe, getInstance } = store;
    const unsubscribe = subscribe();
    symbols.push(getInstance().selectedInfo.get());
    getInstance().decrease();
    symbols.push(getInstance().selectedInfo.get());
    getInstance().decrease();
    symbols.push(getInstance().selectedInfo.get());
    expect(symbols[1]).toBe(symbols[2]);
    unsubscribe();
  });
});
