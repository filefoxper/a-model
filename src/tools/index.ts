export function noop() {
  /** This is a noop function */
}

export function simpleErrorProcess(errors: any[]) {
  return function wrap<R extends (...args: any[]) => any>(callback: R): R {
    return function replaced(...args: any[]) {
      try {
        return callback(...args);
      } catch (e) {
        errors.push(e);
      }
    } as R;
  };
}

export { createSimpleProxy, createProxy } from './proxy';

export { shallowEqual } from './shallowEqual';
