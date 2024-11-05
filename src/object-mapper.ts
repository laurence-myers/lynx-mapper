import { OmitProperty } from "./omit-property.ts";
import type {
  MapperFunction,
  MapperSchemaValue,
  ObjectMapperFunction,
  ObjectMapperSchema,
  OptionalArgIfUndefined,
} from "./types.ts";

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
 * Used to determine if a {@linkcode MapperSchemaValue} is a mapper function,
 *  or a string (representing a property name on some output type).
 *
 * @private
 */
function isMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
>(
  value: MapperSchemaValue<TInput, TOutput, TContext>,
): value is MapperFunction<TInput, TOutput, TContext> {
  return typeof value === "function";
}

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
 * const objectMapper = ObjectMapper.create<Input, Output>()({
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
 * const objectMapperWithContext = ObjectMapper.create<Input, Output, Context>()({
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
  /**
   * There's a chance you can pass an ObjectMapperSchema with more properties than you
   *  expect. This can happen if you use the spread operator to re-use some other schema.
   *  To catch this issue, call this function with the type parameters for the object
   *  mapper schema, and immediately call the returned function, passing your object
   *  mapper schema.
   *
   *  @example ```ts
   *  const mapper1 = ObjectMapper.create<{ in1: string }, { out1: string; out2: string }>()({
   *    out1: "in1",
   *    out2: "in1",
   *  });
   *
   *  // const mapper2 = ObjectMapper.create<{ in1: string }, { out1: string; out3: string }>()({
   *  //   ...mapper1.schema, // error, "out2" is present but shouldn't be
   *  //   out3: "in1",
   *  // });
   *  ```
   */
  public static create<
    TInput extends object,
    TOutput extends object,
    TContext extends object | undefined = undefined,
  >() {
    type TDesiredSchema = ObjectMapperSchema<TInput, TOutput, TContext>;
    return function <
      TActualSchema extends
        & TDesiredSchema
        & {
          [
            P in Exclude<
              keyof TActualSchema,
              keyof TDesiredSchema
            >
          ]: never;
        },
    >(
      schema: TActualSchema,
    ): ObjectMapper<TInput, TOutput, TContext> {
      return new ObjectMapper<TInput, TOutput, TContext>(schema);
    };
  }

  /**
   * For faster runtime performance, the object mapper schema is converted to
   *  a Map instance.
   * @private
   */
  protected readonly schemaMap: Map<
    keyof TOutput,
    MapperSchemaValue<TInput, TOutput, TContext>
  >;

  protected constructor(
    /**
     * Defines how to populate property on the output type.
     */
    public readonly schema: ObjectMapperSchema<TInput, TOutput, TContext>,
  ) {
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
      if (!isMapperFunction(getterOrString)) {
        output[key as string] = input[getterOrString];
      } else {
        const mappedValue = getterOrString(input, context);
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
   * const mapObject = (ObjectMapper.create<Input, Output>()({
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
