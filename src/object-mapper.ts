export interface MapperFunction<
  TInput extends object,
  TOutput,
  TContext extends object | undefined
> {
  (input: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;
}

type AllowInputKeyIfInputCanExtendOutput<TInput, TOutputValue> = {
  [TInputKey in keyof TInput]: TInput[TInputKey] extends TOutputValue
    ? TInputKey
    : never;
}[keyof TInput];

type OptionalArgIfUndefined<T> = T extends undefined ? T | void : T;

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
  TContext extends object | undefined
> = {
  [K in keyof TOutput]-?:
    | MapperFunction<TInput, TOutput[K], TContext>
    | AllowInputKeyIfInputCanExtendOutput<TInput, TOutput[K]>;
};

interface ObjectMapperFunctionBeingBuilt<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

export interface ObjectMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

/**
 * Convert from one type of object to another.
 */
export class ObjectMapper<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined
> {
  /**
   * Used for mapping one array to another array.
   */
  public static array<
    TInput extends object,
    TContext extends object | undefined,
    TNestedInput extends object,
    TNestedOutput extends object,
    TNestedContext extends object | undefined
  >(
    mapper: MapperFunction<TNestedInput, TNestedOutput, TNestedContext>,
    inputGetter: (
      input: TInput,
      context: OptionalArgIfUndefined<TContext>
    ) => readonly TNestedInput[],
    contextFactory: (
      input: TInput,
      context: OptionalArgIfUndefined<TContext>
    ) => TNestedContext
  ): MapperFunction<TInput, TNestedOutput[], TContext> {
    return function arrayMapper(input, context) {
      const nestedInput = inputGetter(input, context);
      const nestedContext = contextFactory(input, context);
      return nestedInput.map((value) =>
        mapper(value, nestedContext as OptionalArgIfUndefined<TNestedContext>)
      );
    };
  }

  /**
   * Returns the input value.
   */
  public static identity<T>(value: T): T {
    return value;
  }

  public static nested<
    TInput extends object,
    TContext extends object | undefined,
    TNestedInput extends object,
    TNestedOutput extends object,
    TNestedContext extends object | undefined
  >(
    objectMapper: ObjectMapper<TNestedInput, TNestedOutput, TNestedContext>,
    inputGetter: (
      input: TInput,
      context: OptionalArgIfUndefined<TContext>
    ) => TNestedInput,
    contextFactory: (
      input: TInput,
      context: OptionalArgIfUndefined<TContext>
    ) => TNestedContext
  ): MapperFunction<TInput, TNestedOutput, TContext> {
    return function nestedObjectMapper(input, context) {
      const nestedInput = inputGetter(input, context);
      const nestedContext = contextFactory(input, context);
      return objectMapper.map(
        nestedInput,
        nestedContext as OptionalArgIfUndefined<TNestedContext>
      );
    };
  }

  public static null(): null {
    return null;
  }

  public static undefined(): undefined {
    return undefined;
  }

  constructor(
    public readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>
  ) {}

  // Unsafe stuff happens here
  map(value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput {
    const output: Record<string, any> = {};
    for (const [key, getterOrString] of Object.entries(this.schema)) {
      if (typeof getterOrString === "string") {
        output[key] = (value as any)[getterOrString];
      } else {
        output[key] = (
          getterOrString as MapperFunction<TInput, TOutput, TContext>
        )(value, context);
      }
    }
    return output as TOutput;
  }

  toFunction(): ObjectMapperFunction<TInput, TOutput, TContext> {
    const func: ObjectMapperFunctionBeingBuilt<TInput, TOutput, TContext> = (
      value,
      context
    ) => this.map(value, context as OptionalArgIfUndefined<TContext>);
    func.schema = this.schema;
    return func;
  }
}
