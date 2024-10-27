import { OmitProperty } from "./omit-property.ts";

export interface MapperFunction<
  TInput extends object,
  TOutput,
  TContext extends object | undefined,
> {
  (
    input: TInput,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | OmitProperty;
}

type AllowInputKeyIfInputCanExtendOutput<TInput, TOutputValue> = {
  [TInputKey in keyof TInput]: TInput[TInputKey] extends TOutputValue
    ? TInputKey
    : never;
}[keyof TInput];

export type MapperSchemaValue<
  TInput extends object,
  TOutput,
  TContext extends object | undefined,
  TOutputKey extends keyof TOutput = keyof TOutput,
> =
  | MapperFunction<TInput, TOutput[TOutputKey], TContext>
  | AllowInputKeyIfInputCanExtendOutput<TInput, TOutput[TOutputKey]>;

export type OptionalArgIfUndefined<T> = T extends undefined ? T | void : T;

/**
 * Every property name must match a property name in the desired output type.
 * Every property value must be a function, that accepts the whole input value,
 * and returns a single value conforming to the output type's property type.
 *
 * A property value can _also_ be a string, matching a property name on the
 * input type, _if_ the input property value has a type acceptable to the
 * output property.
 * For example:
 *
 * ```
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
 * new ObjectMapper<Input, Output>({
 *   outString: "inString" // This is okay, since `Input["inString"]` has the same type as `Output["outString"]`
 * });
 *
 * new ObjectMapper<Input, Output>({
 *   outString: "inNumber" // This will error. `inNumber` has type `number`, so can't be used to populate `outString` which requires a `string`.
 * });
 *
 * new ObjectMapper<Input, Output>({
 *   outString: "inOptionalString" // This will error. `inOptionalString` can be `undefined`, which isn't compatible with `string` (when strict null checks are on).
 * }, undefined);
 * ```
 *
 * The mapper function accepts a "context", which can store extra data, alongside the specific object you're mapping.
 * Pass `undefined` if you don't need any extra data. You can also omit the argument.
 */
export type ObjectMapperSchema<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined,
> = {
  [K in keyof TOutput]-?: MapperSchemaValue<TInput, TOutput, TContext, K>;
};

interface ObjectMapperFunctionBeingBuilt<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

export interface ObjectMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

function isProbablyKeyof<TObject>(
  value: keyof TObject | unknown,
): value is keyof TObject {
  return typeof value === "string";
}

/**
 * Convert from one type of object to another.
 */
export class ObjectMapper<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  private readonly schemaMap: Map<
    keyof TOutput,
    MapperSchemaValue<TInput, TOutput, TContext>
  >;

  constructor(
    public readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>,
  ) {
    this.schemaMap = new Map<
      keyof TOutput,
      MapperSchemaValue<TInput, TOutput, TContext>
    >(Object.entries(this.schema) as [
      keyof TOutput,
      MapperSchemaValue<TInput, TOutput, TContext>,
    ][]);
  }

  array(
    input: Iterable<TInput>,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[];
  array(
    input: Iterable<TInput> | null,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | null;
  array(
    input: Iterable<TInput> | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | undefined;
  array(
    input: Iterable<TInput> | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | null | undefined;
  array(
    input: Iterable<TInput> | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | null | undefined {
    if (input === undefined || input === null) {
      return input;
    } else if (Array.isArray(input)) {
      // This approach might be faster than using the iterator protocol ("for of" loop)
      return input.map((item) => this.map(item, context));
    } else {
      const output = [];
      for (const item of input) {
        output.push(this.map(item, context));
      }
      return output;
    }
  }

  map(value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;
  map(
    value: TInput | null,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | null;
  map(
    value: TInput | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | undefined;
  map(
    value: TInput | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | null | undefined;
  map(value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput {
    if (value === null || value === undefined) {
      return value;
    }
    // Unsafe stuff happens here
    const output: Record<string, unknown> = {};
    for (const [key, getterOrString] of this.schemaMap) {
      if (isProbablyKeyof<TOutput>(getterOrString)) {
        output[key as string] = value[getterOrString];
      } else {
        const mappedValue = (
          getterOrString as MapperFunction<TInput, TOutput, TContext>
        )(value, context);
        if (mappedValue !== OmitProperty) {
          output[key as string] = mappedValue;
        }
      }
    }
    return output as TOutput;
  }

  toFunction(): ObjectMapperFunction<TInput, TOutput, TContext> {
    const func: ObjectMapperFunctionBeingBuilt<TInput, TOutput, TContext> = (
      value,
      context,
    ) => this.map(value, context);
    func.schema = this.schema;
    return func;
  }
}
