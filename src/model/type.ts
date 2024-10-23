export interface ModelInstance {
  [key: string]: unknown;
  [key: number]: unknown;
}

export type ValidInstance<S, T extends ModelInstance> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => S
    ? T[K]
    : T[K] extends (...args: unknown[]) => unknown
      ? never
      : T[K];
};

export type Model<S, T extends ModelInstance> = (
  state: S
) => ValidInstance<S, T>;
