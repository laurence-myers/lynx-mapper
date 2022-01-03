export interface MapperFunction<
  TInput extends object,
  TOutput,
  TContext extends object | undefined
> {
  (input: TInput, context: TContext): TOutput;
}

type AllowInputKeyIfInputCanExtendOutput<TInput, TOutputValue> = {
  [TInputKey in keyof TInput]: TInput[TInputKey] extends TOutputValue
    ? TInputKey
    : never;
}[keyof TInput];

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
 *   outString: "inString" // This is okay, since `Input['inString']` has the same type as `Output["outString"]`
 * }, undefined);
 *
 * new ObjectMapper<Input, Output>({
 *   outString: "inNumber" // This will error. `inNumber` has type `number`, so can't be used to populate `outString` which requires a `string`.
 * }, undefined);
 *
 * new ObjectMapper<Input, Output>({
 *   outString: "inOptionalString" // This will error. `inOptionalString` can be `undefined`, which isn't compatible with `string` (when strict null checks are on).
 * }, undefined);
 * ```
 *
 * The mapper function accepts a "context", which can store extra data, alongside the specific object you're mapping.
 * Pass `undefined` if you don't need any extra data.
 * (TODO: make it optional without breaking type safety.)
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
  (value: TInput, context: TContext): TOutput;
  schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

export interface ObjectMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined
> {
  (value: TInput, context: TContext): TOutput;
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
  map(value: TInput, context: TContext): TOutput {
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
    ) => this.map(value, context);
    func.schema = this.schema;
    return func;
  }
}
