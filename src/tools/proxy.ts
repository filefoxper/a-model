function getDescriptors(
  target: any,
  receiver: any,
  ownOrPrototype: any,
  handler: ProxyHandler<any>
) {
  const it = Object.keys(ownOrPrototype);
  const result: Record<string, PropertyDescriptor> = {};
  it.forEach(key => {
    result[key] = {
      get: (): any => {
        if (!handler.get) {
          return target[key];
        }
        return handler.get(target, key, receiver);
      },
      set: (v: any) => {
        if (!handler.set) {
          // eslint-disable-next-line no-param-reassign
          target[key] = v;
          return;
        }
        const valid = handler.set(target, key, v, receiver);
        if (!valid) {
          throw new Error(`${key} in proxy target is not mutable`);
        }
      }
    };
  });
  return result;
}

export const createSimpleProxy = <T extends Record<string, unknown>>(
  target: T,
  handler: ProxyHandler<T>
): T => {
  const proxy = {};
  const own = getDescriptors(target, proxy as T, target, handler);
  const prototype = getDescriptors(
    target,
    proxy as T,
    Object.getPrototypeOf(target),
    handler
  );
  Object.defineProperties(proxy, { ...prototype, ...own });
  return proxy as T;
};

export const createProxy = <T extends Record<string, any>>(
  target: T,
  handler: ProxyHandler<T>
): T => {
  if (typeof Proxy !== 'function') {
    return createSimpleProxy(target, handler);
  }
  return new Proxy(target, handler);
};
