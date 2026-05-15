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
  constant<TValue>(this: void, value: TValue): () => TValue {
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
  omit(this: void): OmitProperty {
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
  null(this: void): null {
    return null;
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
  pick<TKey extends PropertyKey>(
    this: void,
    key: TKey,
    ...keys: TKey[]
  ): { [K in TKey]: K } {
    return [key, ...keys].reduce((acc, key) => {
      acc[key] = key;
      return acc;
    }, {} as { [K in TKey]: K });
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
  undefined(this: void): undefined {
    return undefined;
  },
};
