import { OmitProperty } from "./omit-property.ts";

/**
 * Provides convenience functions for object mappers.
 *
 * Use these to map to constant values, or to omit the property.
 *
 * @category runtime
 */
export const mapFromAsync = {
  /**
   * Returns a function that always returns a constant value.
   *
   * ```ts
   * const objectMapperSchema = {
   *   out: mapFrom.constant('Hello'),
   * }
   * ```
   */
  constant<TValue>(this: void, value: TValue): () => Promise<TValue> {
    return function constant(): Promise<TValue> {
      return Promise.resolve(value);
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
  omit(this: void): Promise<OmitProperty> {
    return Promise.resolve(OmitProperty);
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
  null(this: void): Promise<null> {
    return Promise.resolve(null);
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
  undefined(this: void): Promise<undefined> {
    return Promise.resolve(undefined);
  },
};
