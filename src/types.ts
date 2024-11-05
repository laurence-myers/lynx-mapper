/**
 * These types are used by the ObjectMapper. Here's the magic which makes
 *  object mapper schemas type safe and complete. You generally won't need to
 *  make use of these types within your own code; just `ObjectMapper` should be
 *  enough.
 *
 * @module
 */

import { OmitProperty } from "./omit-property.ts";

/**
 * A function that takes some input object, and an optional context object, and returns an
 *  output. This is used as part of an {@linkcode ObjectMapperSchema}.
 * @param input The input object.
 * @param context The context object. If the `TContext` type parameter is `undefined`, you can omit this argument.
 * @returns The output value, OR the special symbol {@linkcode OmitProperty}`, indicating that the property should be omitted
 *   completely.
 */
export interface MapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined,
  TOutputKey extends keyof TOutput = keyof TOutput,
> {
  <TInputSubset extends TInput, TContextSubset extends TContext>(
    input: TInputSubset,
    context: OptionalArgIfUndefined<TContextSubset>,
  ): TOutput[TOutputKey] | AllowOmitIfOptional<TOutput, TOutputKey>;
}

/**
 * Given some object `TInput`, and some value `TOutputValue`, allows any key
 *  of `TInput` that can be assigned to `TOutputValue`.
 *
 * @private
 * @example
 * ```ts
 * import { AllowInputKeyIfInputCanExtendOutput } from "./types.ts";
 *
 * interface SomeInput {
 *   inString: string;
 *   inStringOrUndefined: string | undefined;
 *   inNumber: number;
 * }
 *
 * type SomeOutput = string | undefined;
 *
 * type AllowedKey = AllowInputKeyIfInputCanExtendOutput<SomeInput, SomeOutput>;
 *
 * let key: AllowedKey = "inString";
 * key = "inStringOrUndefined";
 * // key = "inNumber"; // type error
 * ```
 */
export type AllowInputKeyIfInputCanExtendOutput<TInput, TOutputValue> = {
  [TInputKey in keyof TInput]: TInput[TInputKey] extends TOutputValue
    ? TInputKey
    : never;
}[keyof TInput];

/**
 * Lots you use the special symbol `OmitProperty` in place of an optional/undefined value.
 * @private
 */
export type AllowOmitIfOptional<
  TOutput extends object,
  TOutputKey extends keyof TOutput,
> = {
  [K in TOutputKey]?: TOutput[TOutputKey];
} extends Pick<TOutput, TOutputKey> ? OmitProperty
  : never;

/**
 * A mapper function, or input property name, used in an {@linkcode ObjectMapperSchema}.
 *
 * In an {@linkcode ObjectMapperSchema}, each property value can be either:
 * - A {@linkcode MapperFunction}
 * - A property name from the input object. The property value must be compatible
 *   with the output property.
 */
export type MapperSchemaValue<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined,
  TOutputKey extends keyof TOutput = keyof TOutput,
> =
  | MapperFunction<TInput, TOutput, TContext, TOutputKey>
  | AllowInputKeyIfInputCanExtendOutput<TInput, TOutput[TOutputKey]>;

/**
 * An ObjectMapper can take an optional context. The context type is defined
 *  when you instantiate an ObjectMapper. If the context type is `undefined`,
 *  rather than passing `undefined` every time, you can just omit the property.
 *  (You can still pass `undefined`, for parity with the mappers that require
 *  a context.)
 *
 * @private
 */
export type OptionalArgIfUndefined<T> = T extends undefined ? T | void : T;

/**
 * An object, where every property name must match a property name in the desired output type.
 *  Every property value must be a {@linkcode MapperSchemaValue}.
 *
 * @example ```ts
 * interface Input {
 *   inString: string;
 *   inNumber: number;
 *   inOptionalString: string | undefined;
 * }
 *
 * interface Output {
 *   outString: string;
 * }
 *
 * let mapperSchema: ObjectMapperSchema<Input, Output> = {
 *   outString: (input: Input) => input.inString,
 * };
 *
 * mapperSchema = {
 *   outString: (input, _context: undefined | void) => input.inString,
 * };
 *
 * mapperSchema = {
 *   outString: "inString", // This is okay, since `Input["inString"]` has the same type as `Output["outString"]`
 * };
 *
 * // mapperSchema = {
 * //   outString: "inNumber", // This will error. `inNumber` has type `number`, so can't be used to populate `outString` which requires a `string`.
 * // };
 *
 * // mapperSchema = {
 * //  outString: "inOptionalString", // This will error. `inOptionalString` can be `undefined`, which isn't compatible with `string` (when strict null checks are on).
 * // };
 *
 * interface Context {
 *   capitalize: boolean;
 * }
 *
 * const mapperSchemaWithContext: ObjectMapperSchema<Input, Output, Context> = {
 *   outString: (input, context) => context.capitalize ? input.inString.toUpperCase() : input.inString,
 * };
 * ```
 */
export type ObjectMapperSchema<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> = {
  [TOutputKey in keyof TOutput]-?: MapperSchemaValue<
    TInput,
    TOutput,
    TContext,
    TOutputKey
  >;
};

/**
 * A callable function, equivalent to calling {@linkcode ObjectMapper#map}.
 *  It also exposes {@linkcode ObjectMapperFunction#schema} as a readonly property.
 */
export interface ObjectMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}
