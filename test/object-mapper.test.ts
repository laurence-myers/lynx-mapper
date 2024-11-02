import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { ObjectMapper } from "../src/object-mapper.ts";
import { mapFrom } from "../src/map-from.ts";
import { OmitProperty } from "../src/omit-property.ts";

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
    outStringConstant: string;
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
      outStringConstant: mapFrom.constant("someConstantValue"), // no input value
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
      outStringConstant: "someConstantValue",
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
    function mapInStringNullable(
      input: Pick<Input, "inStringNullable">,
    ): string | null {
      return input.inStringNullable;
    }

    const objectMapper = new ObjectMapper<Input, Output>({
      outString: (input) => input.inString,
      outStringConstant: () => "someConstantValue",
      outStringNullable: mapInStringNullable,
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
      // @ts-expect-error TS2322 Properties can only be omitted if they are optional, not `undefined`
      outStringUndefined: mapFrom.omit,
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
      outStringConstant: mapFrom.constant("someConstantValue"),
      outStringNullable: mapFrom.null,
      outStringNullableUndefined: mapFrom.undefined,
      outStringOptional: mapFrom.omit,
      outStringOptionalNullable: () => OmitProperty,
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

  it(`can reuse schema from an existing mapper`, () => {
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

    const objectMapperV1 = new ObjectMapper<InputV1, OutputV1>({
      out1: (input: Pick<InputV1, "in1">) => input.in1.toUpperCase(),
      out2: "in2",
    });
    const objectMapperV2 = new ObjectMapper<InputV1, OutputV2>({
      ...omit(objectMapperV1.schema, ["out2"]),
      out3: objectMapperV1.schema.out2,
    });

    const expectedOutput1: OutputV1 = {
      out1: "HELLO",
      out2: 123,
    };
    expect(objectMapperV1.map({
      in1: "hello",
      in2: 123,
    })).toStrictEqual(expectedOutput1);

    const expectedOutput2: OutputV2 = {
      out1: "HELLO",
      out3: 123,
    };
    expect(objectMapperV2.map({
      in1: "hello",
      in2: 123,
    })).toStrictEqual(expectedOutput2);
  });

  it(`LIMITATION: can reuse a mapper function for a different input type, but not directly from the schema`, () => {
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

    const objectMapperV1 = new ObjectMapper<InputV1, Output>({
      out1: (input: Pick<InputV1, "in1">) => input.in1.toUpperCase(),
      out2: "in2",
    });

    new ObjectMapper<InputV2, Output>({
      // @ts-expect-error: The V1 mapper requires a V1 input, which isn't compatible with a V2 input
      out1: objectMapperV1.schema.out1,
      out2: mapFrom.undefined,
    });

    function getIn1(input: Pick<InputV1, "in1">) {
      return input.in1.toUpperCase();
    }

    new ObjectMapper<InputV2, Output>({
      out1: getIn1, // This works, because it's a more specific type
      out2: mapFrom.undefined,
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

    it(`requires nested objects to be completely mapped`, () => {
      // Setup
      const input: Input = {
        foo: "fooValue",
      };

      const nestedObjectMapper = new ObjectMapper<NestedInput, NestedOutput>({
        bar: "baz",
      });

      const mapper = new ObjectMapper<Input, Output>({
        nested: (input: Input) => nestedObjectMapper.map({ baz: input.foo }),
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

    it(`can pass a sub-context to the nested mapper`, () => {
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
        nested: (input: Input) =>
          nestedObjectMapper.map({ baz: input.foo }, { capitalize: true }),
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
        outputArray: (input) => nestedObjectMapper.array(input.inputArray),
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

      const nestedObjectMapper = new ObjectMapper<NestedInput, NestedOutput>({
        bar: "baz",
      });

      // Setup
      new ObjectMapper<Input, Output>({
        nullable: (input) => nestedObjectMapper.map(input.nullable),
        nullableOptional: (input) =>
          nestedObjectMapper.map(input.nullableOptional),
        optional: (input) => nestedObjectMapper.map(input.optional),
      });

      new ObjectMapper<Input, Output>({
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

      const nestedObjectMapper = new ObjectMapper<NestedInput, NestedOutput>({
        bar: "baz",
      });

      // Setup
      new ObjectMapper<Input, Output>({
        nullable: (input) => nestedObjectMapper.array(input.nullable),
        nullableOptional: (input) =>
          nestedObjectMapper.array(input.nullableOptional),
        optional: (input) => nestedObjectMapper.array(input.optional),
      });

      new ObjectMapper<Input, Output>({
        // @ts-expect-error Can't return undefined for a nullable output
        nullable: (input) => nestedObjectMapper.array(input.optional),
        nullableOptional: (input) =>
          nestedObjectMapper.array(input.nullableOptional),
        // @ts-expect-error Can't return null for an optional output
        optional: (input) => nestedObjectMapper.array(input.nullable),
      });
    });
  });
});
