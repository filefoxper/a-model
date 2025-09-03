export function simpleFlatMap<T, U>(
  array: T[],
  callback: (item: T, index: number) => U | Array<U>
): U[] {
  const result: U[] = [];
  array.forEach((item, index) => {
    const r = callback(item, index);
    if (Array.isArray(r)) {
      result.push(...r);
    } else {
      result.push(r);
    }
  });
  return result;
}

export function simpleReduce<T, U>(
  array: T[],
  callback: (previousValue: U, currentValue: T, currentIndex: number) => U,
  initialValue: U
): U {
  let result = initialValue;
  array.forEach((item, index) => {
    result = callback(result, item, index);
  });
  return result;
}
