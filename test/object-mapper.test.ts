import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { ObjectMapper } from "../src/object-mapper.ts";

function stringCounter(start = 0): () => string {
  let i = start;
  return () => {
    return `dummy-string-${++i}`;
  };
}

describe(`ObjectMapper`, () => {
  interface Input {
    inString: string;
    inStringNullable: string | null;
    inStringNullableUndefined: string | null | undefined;
    inStringOptional?: string;
    inStringOptionalNullable?: string | null;
    inStringOptionalNullableUndefined?: string | null | undefined;
    inStringUndefined: string | undefined;
  }

  interface Output {
    outString: string;
    outStringOptional?: string;
    outStringUndefined: string | undefined;
    outStringNullable: string | null;
    outStringOptionalNullable?: string | null;
    outStringNullableUndefined: string | null | undefined;
    outStringOptionalNullableUndefined?: string | null | undefined;
  }

  it(`can map values using strings for property names on the input object`, () => {
    // Setup
    const objectMapper = new ObjectMapper<Input, Output>({
      outString: "inString",
      outStringNullable: "inStringNullable",
      outStringNullableUndefined: "inStringNullableUndefined",
      outStringOptional: "inStringOptional",
      outStringOptionalNullable: "inStringOptionalNullable",
      outStringOptionalNullableUndefined: "inStringOptionalNullableUndefined",
      outStringUndefined: "inStringUndefined",
    });

    const nextString = stringCounter();
    const input: Input = {
      inString: nextString(),
      inStringNullable: nextString(),
      inStringNullableUndefined: nextString(),
      inStringOptional: nextString(),
      inStringOptionalNullable: nextString(),
      inStringOptionalNullableUndefined: nextString(),
      inStringUndefined: nextString(),
    };

    // Execute
    const output = objectMapper.map(input);

    // Verify
    expect(output).toStrictEqual({
      outString: "dummy-string-1",
      outStringNullable: "dummy-string-2",
      outStringNullableUndefined: "dummy-string-3",
      outStringOptional: "dummy-string-4",
      outStringOptionalNullable: "dummy-string-5",
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    });
  });

  it(`can map values using functions`, () => {
    // Setup
    const objectMapper = new ObjectMapper<Input, Output>({
      outString: (input) => input.inString,
      outStringNullable: (input) => input.inStringNullable,
      outStringNullableUndefined: (input) => input.inStringNullableUndefined,
      outStringOptional: (input) => input.inStringOptional,
      outStringOptionalNullable: (input) => input.inStringOptionalNullable,
      outStringOptionalNullableUndefined: (input) =>
        input.inStringOptionalNullableUndefined,
      outStringUndefined: (input) => input.inStringUndefined,
    });

    const nextString = stringCounter();
    const input: Input = {
      inString: nextString(),
      inStringNullable: nextString(),
      inStringNullableUndefined: nextString(),
      inStringOptional: nextString(),
      inStringOptionalNullable: nextString(),
      inStringOptionalNullableUndefined: nextString(),
      inStringUndefined: nextString(),
    };
    const context = undefined;

    // Execute
    const output = objectMapper.map(input, context);

    // Verify
    expect(output).toStrictEqual({
      outString: "dummy-string-1",
      outStringNullable: "dummy-string-2",
      outStringNullableUndefined: "dummy-string-3",
      outStringOptional: "dummy-string-4",
      outStringOptionalNullable: "dummy-string-5",
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    });
  });

  it(`can map values using functions, with an additional context object`, () => {
    // Setup
    const objectMapper = new ObjectMapper<
      Pick<Input, "inString">,
      Pick<Output, "outString">,
      { inStringOverride: string }
    >({
      outString: (_, context) => context.inStringOverride,
    });

    const nextString = stringCounter();
    const input: Pick<Input, "inString"> = {
      inString: nextString(),
    };
    const context = {
      inStringOverride: nextString(),
    };

    // Execute
    // @ts-expect-error TS2554 If a context type is not `undefined`, a context must be provided.
    const failingCall = () => objectMapper.map(input);
    expect(failingCall).toThrow(TypeError);
    const output = objectMapper.map(input, context);

    // Verify
    expect(output.outString).not.toEqual(input.inString);
    expect(output.outString).toEqual(context.inStringOverride);
  });

  it(`cannot use the name of a property where the input type is a superset of the output type`, () => {
    // Setup
    new ObjectMapper<Input, Output>({
      // @ts-expect-error TS2322 The input value can't be `undefined` if the output value is `string`
      outString: "inStringUndefined",
      // @ts-expect-error TS2322 `undefined` is not compatible with string/null.
      outStringNullable: "inStringUndefined",
      outStringNullableUndefined: "inStringOptional", // this is okay, optional is usually compatible with undefined
      // @ts-expect-error TS2322 `null` is not compatible with string/optional.
      outStringOptional: "inStringNullable",
      outStringOptionalNullable: "inStringUndefined",
      outStringOptionalNullableUndefined: "inString", // this is okay, it's a subset
      outStringUndefined: ObjectMapper.undefined, // Can use this convenience static method to always map to `undefined`
    });
  });

  it(`cannot use functions returning a superset of the output type`, () => {
    // Setup
    new ObjectMapper<Input, Pick<Output, "outString">>({
      // @ts-expect-error TS2322 The input value can't be `undefined` if the output value is `string`
      outString: (input) => input.inStringUndefined,
    });
  });

  it(`can convert an ObjectMapper instance into a function`, () => {
    // Setup
    const objectMapperInstance = new ObjectMapper<Input, Output>({
      outString: "inString",
      outStringNullable: ObjectMapper.null,
      outStringNullableUndefined: ObjectMapper.undefined,
      outStringOptional: "inStringOptional",
      outStringOptionalNullable: "inStringOptionalNullable",
      outStringOptionalNullableUndefined: "inStringOptionalNullableUndefined",
      outStringUndefined: "inStringUndefined",
    });

    const nextString = stringCounter();
    const input: Input = {
      inString: nextString(),
      inStringNullable: nextString(),
      inStringNullableUndefined: nextString(),
      inStringOptional: nextString(),
      inStringOptionalNullable: nextString(),
      inStringOptionalNullableUndefined: nextString(),
      inStringUndefined: nextString(),
    };
    const context = undefined;

    // Execute
    const objectMapperFunction = objectMapperInstance.toFunction();
    objectMapperFunction(input, context); // accepts context of "undefined"
    const output = objectMapperFunction(input); // accepts no context arg

    // Verify
    expect(output).toStrictEqual({
      outString: "dummy-string-1",
      outStringNullable: null,
      outStringNullableUndefined: undefined,
      outStringOptional: "dummy-string-4",
      outStringOptionalNullable: "dummy-string-5",
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    });
    expect(objectMapperFunction.schema).toBe(objectMapperInstance.schema);
  });

  describe(`nested objects`, () => {
    interface Input {
      foo: string;
    }

    interface Output {
      nested: {
        bar?: string;
      };
    }

    interface NestedInput {
      baz: string;
    }

    type NestedOutput = Output["nested"];

    it(`requires nested objects to be completely mapped`, () => {
      // Setup
      const input: Input = {
        foo: "fooValue",
      };

      const nestedObjectMapper = new ObjectMapper<NestedInput, NestedOutput>({
        bar: "baz",
      });

      const mapper = new ObjectMapper<Input, Output>({
        nested: ObjectMapper.nested(
          nestedObjectMapper,
          (input: Input) => ({ baz: input.foo }),
          ObjectMapper.undefined,
        ),
      });

      // Execute
      const result = mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        nested: {
          bar: "fooValue",
        },
      });
    });

    // The sub-context requires a factory function, accepting the outer input and context.
    it(`requires passing a sub-context to the nested mapper`, () => {
      // Setup
      interface NestedContext {
        capitalize: boolean;
      }

      const input: Input = {
        foo: "fooValue",
      };

      const nestedObjectMapper = new ObjectMapper<
        NestedInput,
        NestedOutput,
        NestedContext
      >({
        bar: (input, context) =>
          context.capitalize ? input.baz.toUpperCase() : input.baz,
      });

      const mapper = new ObjectMapper<Input, Output>({
        nested: ObjectMapper.nested(
          nestedObjectMapper,
          (input: Input) => ({ baz: input.foo }),
          () => ({ capitalize: true }),
        ),
      });

      // Execute
      const result = mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        nested: {
          bar: "FOOVALUE",
        },
      });
    });

    it(`can map arrays of nested objects`, () => {
      // Setup
      interface NestedInput {
        inputValue: string;
      }

      interface Input {
        inputArray: NestedInput[];
      }

      interface NestedOutput {
        outputValue: string;
      }

      interface Output {
        outputArray: NestedOutput[];
      }

      const input: Input = {
        inputArray: [
          {
            inputValue: "nestedInputValue",
          },
        ],
      };

      const nestedObjectMapper = new ObjectMapper<NestedInput, NestedOutput>({
        outputValue: "inputValue",
      });

      const mapper = new ObjectMapper<Input, Output>({
        outputArray: ObjectMapper.array(
          ObjectMapper.nested(
            nestedObjectMapper,
            ObjectMapper.identity,
            ObjectMapper.undefined,
          ),
          (input: Input) => input.inputArray,
          ObjectMapper.undefined,
        ),
      });

      // Execute
      const result = mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        outputArray: [{
          outputValue: "nestedInputValue",
        }],
      });
    });
  });
});
