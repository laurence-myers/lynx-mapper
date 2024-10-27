export const mapFrom = {
  constant<TValue>(value: TValue): () => TValue {
    return function constant(): TValue {
      return value;
    };
  },
  null(): null {
    return null;
  },
  undefined(): undefined {
    return undefined;
  },
};
