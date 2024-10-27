import { OmitProperty } from "./omit-property.ts";

export const mapFrom = {
  constant<TValue>(value: TValue): () => TValue {
    return function constant(): TValue {
      return value;
    };
  },
  omit(): OmitProperty {
    return OmitProperty;
  },
  null(): null {
    return null;
  },
  undefined(): undefined {
    return undefined;
  },
};
