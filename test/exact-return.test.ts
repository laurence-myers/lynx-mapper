import { describe, it } from "jsr:@std/testing/bdd";
import { type ExactReturn } from "../src/types.ts";

describe("ExactReturn", () => {
  describe("tuple preservation", () => {
    it("preserves positional types in a mutable tuple", () => {
      type Result = ExactReturn<[string, number]>;

      const _el0: Result[0] = "hello";
      // @ts-expect-error TS2322 Position 0 is string, not number
      const _el0Wrong: Result[0] = 42;

      const _el1: Result[1] = 42;
      // @ts-expect-error TS2322 Position 1 is number, not string
      const _el1Wrong: Result[1] = "hello";
    });

    it("preserves tuple length as a fixed literal, not widened to number", () => {
      type Result = ExactReturn<[string, number]>;

      const _len: Result["length"] = 2;
      // @ts-expect-error TS2322 Length is 2, not 3
      const _wrongLen: Result["length"] = 3;
    });

    it("does not accept a wrong-arity array for a 2-tuple", () => {
      type Result = ExactReturn<[string, number]>;

      // @ts-expect-error TS2322 Three elements are too many for a 2-tuple
      const _tooLong: Result = ["a", 1, "extra"];
    });

    it("preserves positional types in a readonly tuple", () => {
      type Result = ExactReturn<readonly [string, number]>;

      const _el0: Result[0] = "hello";
      // @ts-expect-error TS2322 Position 0 is string, not number
      const _el0Wrong: Result[0] = 42;

      const _el1: Result[1] = 42;
      // @ts-expect-error TS2322 Position 1 is number, not string
      const _el1Wrong: Result[1] = "hello";

      const _len: Result["length"] = 2;
      // @ts-expect-error TS2322 Length is 2, not 3
      const _wrongLen: Result["length"] = 3;
    });
  });

  describe("regular array handling", () => {
    it("does not widen a regular array into a tuple", () => {
      type Result = ExactReturn<string[]>;

      // Length must remain the general `number` — both literals are assignable
      const _len0: Result["length"] = 0;
      const _len100: Result["length"] = 100;
    });

    it("does not widen a readonly regular array into a tuple", () => {
      type Result = ExactReturn<readonly string[]>;

      const _len0: Result["length"] = 0;
      const _len100: Result["length"] = 100;
    });
  });
});
