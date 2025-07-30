function isObject(data: any): data is Record<string, unknown> {
  return data && typeof data === 'object';
}

export function shallowEqual<R>(prev: R, current: R): boolean {
  if (Object.is(prev, current)) {
    return true;
  }
  if (!isObject(prev) || !isObject(current)) {
    return false;
  }
  const prevKeys = Object.keys(prev);
  const currentKeys = Object.keys(current);
  if (prevKeys.length !== currentKeys.length) {
    return false;
  }
  const pre = prev as Record<string, unknown>;
  const curr = current as Record<string, unknown>;
  const hasDiffKey = prevKeys.some(
    key => !Object.prototype.hasOwnProperty.call(curr, key)
  );
  if (hasDiffKey) {
    return false;
  }
  const hasDiffValue = currentKeys.some(key => {
    const currentValue = curr[key];
    const prevValue = pre[key];
    return !Object.is(currentValue, prevValue);
  });
  return !hasDiffValue;
}
