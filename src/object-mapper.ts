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
  <TInputSubset extends TInput>(
    input: TInputSubset,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[TOutputKey] | AllowOmitIfOptional<TOutput, TOutputKey>;
}

/**
 * Given some object `TInput`, and some value `TOutputValue`, allows any key
 *  of `TInput` that can be assigned to `TOutputValue`.
 *
 * @private
 * @example
 * ```typescript
 * import { AllowInputKeyIfInputCanExtendOutput } from "./object-mapper.ts";
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

type AllowOmitIfOptional<
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
 * An internal type used by {@linkcode ObjectMapper.toFunction()}
 *
 * @private
 */
interface ObjectMapperFunctionBeingBuilt<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;

  schema: ObjectMapperSchema<TInput, TOutput, TContext>;
}

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

/**
 * Used to determine if a {@linkcode MapperSchemaValue} is a mapper function,
 *  or a string (representing a property name on some output type).
 *
 * @private
 */
function isProbablyKeyof<TObject>(
  value: keyof TObject | unknown,
): value is keyof TObject {
  return typeof value === "string";
}

// Advanced Branded Type to prevent accidental schema reuse
export type BrandedSchema<T> = T & { readonly __objectMapperSchema: true };

export type UnbrandedSchema<T> = T & { readonly __objectMapperSchema?: never };

/**
 * Convert from one type of object to another.
 *
 * Instantiate an instance with a {@linkcode ObjectMapperSchema}. You must pass two type parameters:
 *
 * - `TInput`: the type of the input object
 * - `TOutput`: the type of the desired output object
 *
 * You can pass an optional third type parameter:
 *
 * - `TContext`: an object with any additional data or functions. Useful when mapping multiple
 *   objects with some shared state, like a "now" timestamp.
 *
 * Invoke the mapper with {@linkcode ObjectMapper#map}.
 *
 * If you want a plain (unbound) function, you can call {@linkcode ObjectMapper#toFunction}.
 *
 * There is a convenience method {@linkcode ObjectMapper#array}, for mapping some iterable to an array.
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
 *   outNumber: number;
 * }
 *
 * const objectMapper = new ObjectMapper<Input, Output>({
 *   outString: "inString",
 *   outNumber: (input) => input.inNumber * 100,
 * });
 *
 * const input: Input = {
 *   inString: 'foo',
 *   inNumber: 123,
 *   inOptionalString: undefined,
 * };
 *
 * const output = objectMapper.map(input);
 * console.log(output);
 * // --> { outString: 'foo', outNumber: 12300 }
 *
 * // Using a context
 * interface Context {
 *   multiplier: number,
 * }
 *
 * const objectMapperWithContext = new ObjectMapper<Input, Output, Context>({
 *   outString: "inString",
 *   outNumber: (input, context) => input.inNumber * context.multiplier,
 * });
 *
 * const output2 = objectMapperWithContext.map(input, { multiplier: 200 });
 * console.log(output2);
 * // --> { outString: 'foo', outNumber: 24600 }
 *
 * // This will error; if `TContext` is not undefined, the `context` argument is required.
 * // objectMapperWithContext(input);
 * ```
 *
 * @group runtime
 */
export class ObjectMapper<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  public readonly schema: BrandedSchema<
    ObjectMapperSchema<TInput, TOutput, TContext>
  >;

  /**
   * For faster runtime performance, the object mapper schema is converted to
   *  a Map instance.
   * @private
   */
  private readonly schemaMap: Map<
    keyof TOutput,
    MapperSchemaValue<TInput, TOutput, TContext>
  >;

  constructor(
    /**
     * Defines how to populate property on the output type.
     */
    schema: UnbrandedSchema<ObjectMapperSchema<TInput, TOutput, TContext>>,
  ) {
    this.schema = schema as unknown as BrandedSchema<
      ObjectMapperSchema<TInput, TOutput, TContext>
    >;
    this.schemaMap = new Map<
      keyof TOutput,
      MapperSchemaValue<TInput, TOutput, TContext>
    >(Object.entries(schema) as [
      keyof TOutput,
      MapperSchemaValue<TInput, TOutput, TContext>,
    ][]);
  }

  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   */
  array(
    input: Iterable<TInput>,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[];
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | null,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | null;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `undefined`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | undefined;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null` or `undefined`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput[] | null | undefined;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null` or `undefined`, it will be returned as-is.
   */
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

  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   */
  map(input: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;
  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   *
   * If {@linkcode input} is `null`, it will be returned as-is.
   */
  map(
    input: TInput | null,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | null;
  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   *
   * If {@linkcode input} is `undefined`, it will be returned as-is.
   */
  map(
    input: TInput | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | undefined;
  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   *
   * If {@linkcode input} is `null` or `undefined`, it will be returned as-is.
   */
  map(
    input: TInput | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): TOutput | null | undefined;
  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   *
   * If {@linkcode input} is `null` or `undefined`, it will be returned as-is.
   */
  map(input: TInput, context: OptionalArgIfUndefined<TContext>): TOutput {
    if (input === null || input === undefined) {
      return input;
    }
    // Unsafe stuff happens here
    const output: Record<string, unknown> = {};
    for (const [key, getterOrString] of this.schemaMap) {
      if (isProbablyKeyof<TOutput>(getterOrString)) {
        output[key as string] = input[getterOrString];
      } else {
        const mappedValue = (
          getterOrString as MapperFunction<TInput, TOutput, TContext>
        )(input, context);
        if (mappedValue !== OmitProperty) {
          output[key as string] = mappedValue;
        }
      }
    }
    return output as TOutput;
  }

  /**
   * Wrap this instance in a function, with a `schema` property.
   *
   * @example ```ts
   * interface Input {
   *   in: string;
   * }
   *
   * interface Output {
   *   out: string;
   * }
   *
   * const mapObject = (new ObjectMapper<Input, Output>({
   *   out: "in",
   * })).toFunction();
   *
   * const output = mapObject({
   *   in: 'Hello world!'
   * });
   * ```
   */
  toFunction(): ObjectMapperFunction<TInput, TOutput, TContext> {
    const func: ObjectMapperFunctionBeingBuilt<TInput, TOutput, TContext> = (
      value,
      context,
    ) => this.map(value, context);
    func.schema = this.schema;
    return func;
  }
}
