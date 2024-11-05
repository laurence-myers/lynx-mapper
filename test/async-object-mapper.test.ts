// deno-lint-ignore-file require-await
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { AsyncObjectMapper } from "../src/async-object-mapper.ts";
import { OmitProperty } from "../src/omit-property.ts";
import { mapFromAsync } from "../src/map-from-async.ts";

function omit<TObject extends object, TKeys extends keyof TObject>(
  obj: TObject,
  keys: readonly (TKeys)[],
): Omit<TObject, (typeof keys)[number]> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (keys.indexOf(key as TKeys) === -1) {
      output[key] = value;
    }
  }
  return output as Omit<TObject, typeof keys[number]>;
}

function stringCounter(start = 0): () => string {
  let i = start;
  return () => {
    return `dummy-string-${++i}`;
  };
}

describe(AsyncObjectMapper.name, () => {
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
    outStringConstant: string;
    outStringOptional?: string;
    outStringUndefined: string | undefined;
    outStringNullable: string | null;
    outStringOptionalNullable?: string | null;
    outStringNullableUndefined: string | null | undefined;
    outStringOptionalNullableUndefined?: string | null | undefined;
  }

  it(`can map values using strings for property names on the input object`, async () => {
    // Setup
    const objectMapper = AsyncObjectMapper.create<Input, Output>()({
      outString: "inString",
      outStringConstant: mapFromAsync.constant("someConstantValue"), // no input value
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
    const output = await objectMapper.map(input);

    // Verify
    expect(output).toStrictEqual({
      outString: "dummy-string-1",
      outStringConstant: "someConstantValue",
      outStringNullable: "dummy-string-2",
      outStringNullableUndefined: "dummy-string-3",
      outStringOptional: "dummy-string-4",
      outStringOptionalNullable: "dummy-string-5",
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    });
  });

  it(`can map values using functions`, async () => {
    // Setup
    async function mapInStringNullable(
      input: Pick<Input, "inStringNullable">,
    ): Promise<string | null> {
      return input.inStringNullable;
    }

    const objectMapper = AsyncObjectMapper.create<Input, Output>()({
      outString: async (input) => input.inString,
      outStringConstant: async () => "someConstantValue",
      outStringNullable: mapInStringNullable,
      outStringNullableUndefined: async (input) =>
        input.inStringNullableUndefined,
      outStringOptional: async (input) => input.inStringOptional,
      outStringOptionalNullable: async (input) =>
        input.inStringOptionalNullable,
      outStringOptionalNullableUndefined: async (input) =>
        input.inStringOptionalNullableUndefined,
      outStringUndefined: async (input) => input.inStringUndefined,
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
    const output = await objectMapper.map(input, context);

    // Verify
    const expected = {
      outString: "dummy-string-1",
      outStringConstant: "someConstantValue",
      outStringNullable: "dummy-string-2",
      outStringNullableUndefined: "dummy-string-3",
      outStringOptional: "dummy-string-4",
      outStringOptionalNullable: "dummy-string-5",
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    };
    expect(output).toStrictEqual(expected);
  });

  it(`can map values using functions, with an additional context object`, async () => {
    // Setup
    const objectMapper = AsyncObjectMapper.create<
      Pick<Input, "inString">,
      Pick<Output, "outString">,
      { inStringOverride: string }
    >()({
      outString: async (_, context) => context.inStringOverride,
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
    expect(objectMapper.map(input)).rejects.toThrow(TypeError);
    const output = await objectMapper.map(input, context);

    // Verify
    expect(output.outString).not.toEqual(input.inString);
    expect(output.outString).toEqual(context.inStringOverride);
  });

  it(`cannot use the name of a property where the input type is a superset of the output type`, () => {
    // Setup
    AsyncObjectMapper.create<Input, Output>()({
      // @ts-expect-error TS2322 The input value can't be `undefined` if the output value is `string`
      outString: "inStringUndefined",
      // @ts-expect-error TS2322 `undefined` is not compatible with string/null.
      outStringNullable: "inStringUndefined",
      outStringNullableUndefined: "inStringOptional", // this is okay, optional is usually compatible with undefined
      // @ts-expect-error TS2322 `null` is not compatible with string/optional.
      outStringOptional: "inStringNullable",
      outStringOptionalNullable: "inStringUndefined",
      outStringOptionalNullableUndefined: "inString", // this is okay, it's a subset
      // @ts-expect-error TS2322 Properties can only be omitted if they are optional, not `undefined`
      outStringUndefined: mapFromAsync.omit,
    });
  });

  it(`cannot use functions returning a superset of the output type`, () => {
    // Setup
    AsyncObjectMapper.create<Input, Pick<Output, "outString">>()({
      // @ts-expect-error TS2322 The input value can't be `undefined` if the output value is `string`
      outString: (input) => input.inStringUndefined,
    });
  });

  it(`can convert an ObjectMapper instance into a function`, async () => {
    // Setup
    const objectMapperInstance = AsyncObjectMapper.create<Input, Output>()({
      outString: "inString",
      outStringConstant: mapFromAsync.constant("someConstantValue"),
      outStringNullable: mapFromAsync.null,
      outStringNullableUndefined: mapFromAsync.undefined,
      outStringOptional: mapFromAsync.omit,
      outStringOptionalNullable: async () => OmitProperty,
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
    await objectMapperFunction(input, context); // accepts context of "undefined"
    const output = await objectMapperFunction(input); // accepts no context arg

    // Verify
    const expected: Output = {
      outString: "dummy-string-1",
      outStringConstant: "someConstantValue",
      outStringNullable: null,
      outStringNullableUndefined: undefined,
      // outStringOptional: "dummy-string-4", // omitted
      // outStringOptionalNullable: "dummy-string-5", // omitted
      outStringOptionalNullableUndefined: "dummy-string-6",
      outStringUndefined: "dummy-string-7",
    };
    expect(output).toStrictEqual(expected);
    expect(objectMapperFunction.schema).toBe(objectMapperInstance.schema);
  });

  it(`can reuse schema from an existing mapper`, async () => {
    interface InputV1 {
      in1: string;
      in2: number;
    }

    interface InputV2 extends InputV1 {
      in3: string;
    }

    interface OutputV1 {
      out1: string;
      out2: number;
    }

    interface OutputV2 {
      out1: string;
      out3: number;
    }

    const objectMapperV1 = AsyncObjectMapper.create<InputV1, OutputV1>()({
      out1: async (input: Pick<InputV1, "in1">) => input.in1.toUpperCase(),
      out2: "in2",
    });

    // You can reuse an existing schema, if the inputs and outputs are compatible with the existing schema
    AsyncObjectMapper.create<InputV2, OutputV1>()(
      objectMapperV1.schema,
    );

    const objectMapperV2 = AsyncObjectMapper.create<InputV1, OutputV2>()(
      {
        out1: objectMapperV1.schema.out1,
        out3: objectMapperV1.schema.out2,
      },
    );

    const expectedOutput1: OutputV1 = {
      out1: "HELLO",
      out2: 123,
    };
    expect(
      await objectMapperV1.map({
        in1: "hello",
        in2: 123,
      }),
    ).toStrictEqual(expectedOutput1);

    const expectedOutput2: OutputV2 = {
      out1: "HELLO",
      out3: 123,
    };
    expect(
      await objectMapperV2.map({
        in1: "hello",
        in2: 123,
      }),
    ).toStrictEqual(expectedOutput2);
  });

  it(`can reuse a mapper function for a different input type`, () => {
    interface InputV1 {
      in1: string;
      in2: number;
    }

    interface InputV2 {
      in1: string;
      in3: boolean;
    }

    interface Output {
      out1: string;
      out2?: number;
    }

    const objectMapperV1 = AsyncObjectMapper.create<InputV1, Output>()({
      out1: async (input: Pick<InputV1, "in1">) => input.in1.toUpperCase(),
      out2: "in2",
    });

    AsyncObjectMapper.create<InputV2, Output>()({
      out1: objectMapperV1.schema.out1,
      out2: mapFromAsync.undefined,
    });

    AsyncObjectMapper.create<InputV2, Output>()({
      // @ts-expect-error: the mapper function for "out2" isn't compatible with the "out1" mapper function
      out1: objectMapperV1.schema.out2,
      out2: mapFromAsync.undefined,
    });

    async function getIn1(input: Pick<InputV1, "in1">) {
      return input.in1.toUpperCase();
    }

    AsyncObjectMapper.create<InputV2, Output>()({
      out1: getIn1, // This also works
      out2: mapFromAsync.undefined,
    });
  });

  it(`allows destructuring another schema`, async () => {
    interface InputV1 {
      in1: string;
      in2: number;
    }

    interface OutputV1 {
      out1: string;
      out2: number;
    }

    interface OutputV2 {
      out1: string;
      out3: number;
    }

    const objectMapperV1 = AsyncObjectMapper.create<InputV1, OutputV1>()({
      out1: async (input: Pick<InputV1, "in1">) => input.in1.toUpperCase(),
      out2: "in2",
    });
    const objectMapperV2Bad = AsyncObjectMapper.create<InputV1, OutputV2>()(
      // @ts-expect-error: The destructured schema includes `out2`, which we don't want
      {
        ...objectMapperV1.schema,
        out3: "in2",
      },
    );

    AsyncObjectMapper.create<InputV1, OutputV2>()(
      {
        ...omit(objectMapperV1.schema, ["out2"]),
        out3: objectMapperV1.schema.out2,
      },
    );

    expect(
      await objectMapperV2Bad.map({
        in1: "foo",
        in2: 123,
      }),
    ).toStrictEqual({
      out1: "FOO",
      out2: 123, // <-- DEFECT: unwanted property
      out3: 123,
    });
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

    it(`requires nested objects to be completely mapped`, async () => {
      // Setup
      const input: Input = {
        foo: "fooValue",
      };

      const nestedObjectMapper = AsyncObjectMapper.create<
        NestedInput,
        NestedOutput
      >()({
        bar: "baz",
      });

      const mapper = AsyncObjectMapper.create<Input, Output>()({
        nested: async (input: Input) =>
          nestedObjectMapper.map({ baz: input.foo }),
      });

      // Execute
      const result = await mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        nested: {
          bar: "fooValue",
        },
      });
    });

    it(`can pass a sub-context to the nested mapper`, async () => {
      // Setup
      interface NestedContext {
        capitalize: boolean;
      }

      const input: Input = {
        foo: "fooValue",
      };

      const nestedObjectMapper = AsyncObjectMapper.create<
        NestedInput,
        NestedOutput,
        NestedContext
      >()({
        bar: async (input, context) =>
          context.capitalize ? input.baz.toUpperCase() : input.baz,
      });

      const mapper = AsyncObjectMapper.create<Input, Output>()({
        nested: (input: Input) =>
          nestedObjectMapper.map({ baz: input.foo }, { capitalize: true }),
      });

      // Execute
      const result = await mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        nested: {
          bar: "FOOVALUE",
        },
      });
    });

    it(`can map arrays of nested objects`, async () => {
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

      const nestedObjectMapper = AsyncObjectMapper.create<
        NestedInput,
        NestedOutput
      >()({
        outputValue: "inputValue",
      });

      const mapper = AsyncObjectMapper.create<Input, Output>()({
        outputArray: (input) => nestedObjectMapper.array(input.inputArray),
      });

      // Execute
      const result = await mapper.map(input, undefined);

      // Verify
      expect(result).toStrictEqual({
        outputArray: [{
          outputValue: "nestedInputValue",
        }],
      });
    });

    it(`can pass through optional/nullable values`, () => {
      interface Input {
        nullable: NestedInput | null;
        nullableOptional?: NestedInput | null;
        optional?: NestedInput;
      }

      interface Output {
        nullable: NestedOutput | null;
        nullableOptional?: NestedOutput | null;
        optional?: NestedOutput;
      }

      const nestedObjectMapper = AsyncObjectMapper.create<
        NestedInput,
        NestedOutput
      >()({
        bar: "baz",
      });

      // Setup
      AsyncObjectMapper.create<Input, Output>()({
        nullable: async (input) => nestedObjectMapper.map(input.nullable),
        nullableOptional: (input) =>
          nestedObjectMapper.map(input.nullableOptional),
        optional: (input) => nestedObjectMapper.map(input.optional),
      });

      AsyncObjectMapper.create<Input, Output>()({
        // @ts-expect-error Can't return undefined for a nullable output
        nullable: (input) => nestedObjectMapper.map(input.optional),
        nullableOptional: (input) =>
          nestedObjectMapper.map(input.nullableOptional),
        // @ts-expect-error Can't return null for an optional output
        optional: (input) => nestedObjectMapper.map(input.nullable),
      });
    });

    it(`can pass through optional/nullable arrays`, () => {
      interface Input {
        nullable: readonly NestedInput[] | null;
        nullableOptional?: readonly NestedInput[] | null;
        optional?: Set<NestedInput>;
      }

      interface Output {
        nullable: NestedOutput[] | null;
        nullableOptional?: NestedOutput[] | null;
        optional?: NestedOutput[];
      }

      const nestedObjectMapper = AsyncObjectMapper.create<
        NestedInput,
        NestedOutput
      >()({
        bar: "baz",
      });

      // Setup
      AsyncObjectMapper.create<Input, Output>()({
        nullable: (input) => nestedObjectMapper.array(input.nullable),
        nullableOptional: (input) =>
          nestedObjectMapper.array(input.nullableOptional),
        optional: (input) => nestedObjectMapper.array(input.optional),
      });

      AsyncObjectMapper.create<Input, Output>()({
        // @ts-expect-error Can't return undefined for a nullable output
        nullable: (input) => nestedAsyncObjectMapper.array(input.optional),
        nullableOptional: (input) =>
          nestedObjectMapper.array(input.nullableOptional),
        // @ts-expect-error Can't return null for an optional output
        optional: (input) => nestedAsyncObjectMapper.array(input.nullable),
      });
    });
  });
});
