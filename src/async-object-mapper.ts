import { OmitProperty } from "./omit-property.ts";
import type { OptionalArgIfUndefined } from "./types.ts";
import {
  AsyncMapperFunction,
  AsyncMapperSchemaValue,
  AsyncObjectMapperFunction,
  AsyncObjectMapperSchema,
} from "./async-types.ts";

/**
 * An internal type used by {@linkcode AsyncObjectMapper.toFunction()}
 *
 * @private
 */
interface AsyncObjectMapperFunctionBeingBuilt<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  (value: TInput, context: OptionalArgIfUndefined<TContext>): Promise<TOutput>;

  schema: AsyncObjectMapperSchema<TInput, TOutput, TContext>;
}

/**
 * Used to determine if a {@linkcode MapperSchemaValue} is a mapper function,
 *  or a string (representing a property name on some output type).
 *
 * @private
 */
function isAsyncMapperFunction<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
>(
  value: AsyncMapperSchemaValue<TInput, TOutput, TContext>,
): value is AsyncMapperFunction<TInput, TOutput, TContext> {
  return typeof value === "function";
}

/**
 * Convert from one type of object to another.
 *
 * Instantiate an instance with a {@linkcode AsyncObjectMapperSchema}. You must pass two type parameters:
 *
 * - `TInput`: the type of the input object
 * - `TOutput`: the type of the desired output object
 *
 * You can pass an optional third type parameter:
 *
 * - `TContext`: an object with any additional data or functions. Useful when mapping multiple
 *   objects with some shared state, like a "now" timestamp.
 *
 * Invoke the mapper with {@linkcode AsyncObjectMapper#map}.
 *
 * If you want a plain (unbound) function, you can call {@linkcode AsyncObjectMapper#toFunction}.
 *
 * There is a convenience method {@linkcode AsyncObjectMapper#array}, for mapping some iterable to an array.
 *
 * @group async
 */
export class AsyncObjectMapper<
  TInput extends object,
  TOutput extends object,
  TContext extends object | undefined = undefined,
> {
  /**
   * Create an AsyncObjectMapper factory function. Invoke it immediately,
   *  with an object mapper schema, to create an AsyncObjectMapper instance.
   *
   * We use this approach to trick TypeScript into requiring an exact type
   *  to be passed in. That is, the object mapper schema must only have
   *  properties that exist in the output type, and no additional properties.
   */
  public static create<
    TInput extends object,
    TOutput extends object,
    TContext extends object | undefined = undefined,
  >() {
    type TDesiredSchema = AsyncObjectMapperSchema<TInput, TOutput, TContext>;
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
    ): AsyncObjectMapper<TInput, TOutput, TContext> {
      return new AsyncObjectMapper<TInput, TOutput, TContext>(schema);
    };
  }

  /**
   * For faster runtime performance, the object mapper schema is converted to
   *  a Map instance.
   * @private
   */
  protected readonly schemaMap: Map<
    keyof TOutput,
    AsyncMapperSchemaValue<TInput, TOutput, TContext>
  >;

  protected constructor(
    /**
     * Defines how to populate property on the output type.
     */
    public readonly schema: AsyncObjectMapperSchema<TInput, TOutput, TContext>,
  ) {
    this.schemaMap = new Map<
      keyof TOutput,
      AsyncMapperSchemaValue<TInput, TOutput, TContext>
    >(Object.entries(schema) as [
      keyof TOutput,
      AsyncMapperSchemaValue<TInput, TOutput, TContext>,
    ][]);
  }

  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   */
  array(
    input: Iterable<TInput>,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput[]>;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | null,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput[] | null>;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `undefined`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput[] | undefined>;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null` or `undefined`, it will be returned as-is.
   */
  array(
    input: Iterable<TInput> | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput[] | null | undefined>;
  /**
   * Map multiple input objects from some iterable, and return an
   *  array of output objects.
   *
   * If the input is `null` or `undefined`, it will be returned as-is.
   */
  async array(
    input: Iterable<TInput> | null | undefined,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput[] | null | undefined> {
    if (input === undefined || input === null) {
      return input;
    } else if (Array.isArray(input)) {
      // This approach might be faster than using the iterator protocol ("for of" loop)
      return Promise.all(input.map((item) => this.map(item, context)));
    } else {
      const output = [];
      for (const item of input) {
        output.push(await this.map(item, context));
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
  map(
    input: TInput,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput>;
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
  ): Promise<TOutput | null>;
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
  ): Promise<TOutput | undefined>;
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
  ): Promise<TOutput | null | undefined>;
  /**
   * Maps an input object to an output object.
   *
   * It does so by iterating each property in the object schema,
   *  and invoking the property's mapping function, passing the input and context.
   *
   * If {@linkcode input} is `null` or `undefined`, it will be returned as-is.
   */
  async map(
    input: TInput,
    context: OptionalArgIfUndefined<TContext>,
  ): Promise<TOutput> {
    if (input === null || input === undefined) {
      return input;
    }
    // Unsafe stuff happens here
    const output: Record<string, unknown> = {};
    for (const [key, getterOrString] of this.schemaMap) {
      if (!isAsyncMapperFunction(getterOrString)) {
        output[key as string] = input[getterOrString];
      } else {
        const mappedValue = await getterOrString(input, context);
        if (mappedValue !== OmitProperty) {
          output[key as string] = mappedValue;
        }
      }
    }
    return output as TOutput;
  }

  /**
   * Wrap this instance in a function, with a `schema` property.
   */
  toFunction(): AsyncObjectMapperFunction<TInput, TOutput, TContext> {
    const func: AsyncObjectMapperFunctionBeingBuilt<TInput, TOutput, TContext> =
      (
        value,
        context,
      ) => this.map(value, context);
    func.schema = this.schema;
    return func;
  }
}
