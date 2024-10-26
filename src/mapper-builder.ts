type OptionalArgIfUndefined<T> = T extends undefined ? T | void : T;

export interface MapperFunction<TInput, TOutput, TContext> {
  (input: TInput, context: OptionalArgIfUndefined<TContext>): TOutput;
}

/**
 * Needs to know the initial input and context from the outer mapper. Can be done by changing ObjectMapper to accept
 * a callback function, whose first argument is a MapperBuilder.
 *
 * MapperBuilder could store an array of transformation functions. Building could pipe the inputs through each
 * function. (Needs at least one function; could default to "identity", i.e. return the input.)
 *
 * Should be immutable: each build returns a clone. (For reusing schemas)
 */

export class MapperBuilder<TInput, TOutput, TContext> {
  constructor(protected readonly transforms: Function[] = []) {}

  context(getter: <TContext>(input: TInput, context: TContext) => TOutput) {
    return new MapperBuilder<TInput, TOutput, TContext>(
      this.transforms.concat(getter)
    );
  }

  get(getter: <TOutput>(input: TInput, context: TContext) => TOutput) {
    return new MapperBuilder<TInput, TOutput, TContext>(
      this.transforms.concat(getter)
    );
  }

  build(): MapperFunction<TInput, TOutput, TContext> {
    return (input: TInput, context: OptionalArgIfUndefined<TContext>) => {
      for (const transform of this.transforms) {
        input = transform(input, context);
        // How to support transforming "context"?
      }
      return input as unknown as TOutput;
    };
  }
}
