import { OmitProperty } from "./omit-property.ts";

/**
 * Provides convenience functions for object mappers.
 *
 * Use these to map to constant values, or to omit the property.
 *
 * @category runtime
 */
export const mapFrom = {
  /**
   * Returns a function that always returns a constant value.
   *
   * ```ts
   * const objectMapperSchema = {
   *   out: mapFrom.constant('Hello'),
   * }
   * ```
   */
  constant<TValue>(value: TValue): () => TValue {
    return function constant(): TValue {
      return value;
    };
  },

  /**
   * Returns the symbol {@linkcode OmitProperty}, which will tell the
   * mapper to omit the property from the output object.
   *
   * ```ts
   * const objectMapperSchema = {
   *   out: mapFrom.omit,
   * }
   * ```
   */
  omit(): OmitProperty {
    return OmitProperty;
  },

  /**
   * Always map the output value to `null`
   *
   * ```ts
   * const objectMapperSchema = {
   *   out: mapFrom.null,
   * }
   * ```
   */
  null(): null {
    return null;
  },

  /**
   * Always map the output value to `undefined`
   *
   * ```ts
   * const objectMapperSchema = {
   *   out: mapFrom.undefined,
   * }
   * ```
   */
  undefined(): undefined {
    return undefined;
  },

  /**
   * Maps the specified properties to themselves as is
   *
   * ```ts
   * const objectMapperSchema = {
   *   ...mapFrom.pick('a', 'b', 'c', 'd'),
   * }
   * ```
   */
  pick<TKey extends PropertyKey>(...keys: TKey[]) {
    return keys.reduce((acc, key) => {
      acc[key] = key;
      return acc;
    }, {} as { [K in TKey]: K });
  }
};
