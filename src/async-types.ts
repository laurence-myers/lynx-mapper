/**
 * These types are used by the AsyncObjectMapper. Here's the magic which makes
 *  object mapper schemas type safe and complete. You generally won't need to
 *  make use of these types within your own code; just `ObjectMapper` should be
 *  enough.
 *
 * @module
 */

import {
  AllowInputKeyIfInputCanExtendOutput,
  AllowOmitIfOptional,
  OptionalArgIfUndefined,
} from "./types.ts";

/**
 * A function that takes some input object, and an optional context object, and returns a
 *  promise of an output. This is used as part of an {@linkcode AsyncObjectMapperSchema}.
 * @param input The input object.
 * @param context The context object. If the `TContext` type parameter is `undefined`, you can omit this argument.
 * @returns The output value, OR the special symbol {@linkcode OmitProperty}`, indicating that the property should be omitted
 *   completely.
 */
export interface AsyncMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined,
  TOutputKey extends keyof TOutput = keyof TOutput,
> {
  <TInputSubset extends TInput, TContextSubset extends TContext>(
    input: TInputSubset,
    context: OptionalArgIfUndefined<TContextSubset>,
  ): Promise<TOutput[TOutputKey] | AllowOmitIfOptional<TOutput, TOutputKey>>;
}

/**
 * A mapper function, or input property name, used in an {@linkcode AsyncObjectMapperSchema}.
 *
 * In an {@linkcode AsyncObjectMapperSchema}, each property value can be either:
 * - An {@linkcode AsyncMapperFunction}
 * - A property name from the input object. The property value must be compatible
 *   with the output property.
 */
export type AsyncMapperSchemaValue<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined,
  TOutputKey extends keyof TOutput = keyof TOutput,
> =
  | AsyncMapperFunction<TInput, TOutput, TContext, TOutputKey>
  | AllowInputKeyIfInputCanExtendOutput<TInput, TOutput[TOutputKey]>;

/**
 * An object, where every property name must match a property name in the desired output type.
 *  Every property value must be a {@linkcode AsyncMapperSchemaValue}.
 * ```
 */
export type AsyncObjectMapperSchema<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> = {
  [TOutputKey in keyof TOutput]-?: AsyncMapperSchemaValue<
    TInput,
    TOutput,
    TContext,
    TOutputKey
  >;
};

/**
 * A callable function, equivalent to calling {@linkcode AsyncObjectMapper#map}.
 *  It also exposes {@linkcode AsyncObjectMapperFunction#schema} as a readonly property.
 */
export interface AsyncObjectMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): Promise<TOutput>;

  readonly schema: AsyncObjectMapperSchema<TInput, TOutput, TContext>;
}
