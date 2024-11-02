export const OmitProperty: unique symbol = Symbol("OmitProperty");
/**
 * Use this symbol to tell an ObjectMapper to exclude the property completely from the
 *  output object. This is useful when you must distinguish between `"property" in output`
 *  vs `output.property === undefined`.
 */
export type OmitProperty = typeof OmitProperty;
