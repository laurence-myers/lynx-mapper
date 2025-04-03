import { build, emptyDir } from "@deno/dnt";

const version = Deno.args[0];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Please pass a version number arg, in the form 1.2.3`);
  Deno.exit(1);
}

await emptyDir("./npm");

await build({
  compilerOptions: {
    // Targets NodeJS v20
    "lib": ["ES2023"],
    target: "ES2022",
  },
  entryPoints: ["./mod.ts"],
  filterDiagnostic(diagnostic) {
    const fileName = diagnostic.file?.fileName;
    // The test libs want `Set.intersection()` and `Set.symmetricDifference()`.
    // However, things seem to work if we just ignore the type-check errors.
    if (
      fileName?.includes("@std/assert/1.0.6/") ||
      fileName?.includes("@std/expect/1.0.6/")
    ) {
      return false;
    }
    return true;
  },
  outDir: "./npm",
  package: {
    // package.json properties
    bugs: {
      url: "https://github.com/laurence-myers/lynx-mapper/issues",
    },
    description:
      "Type-safe object mapper, using schema objects, for Plain Old JavaScript Objects (POJOs)",
    license: "MIT",
    name: "lynx-mapper",
    repository: {
      type: "git",
      url: "git+https://github.com/laurence-myers/lynx-mapper",
    },
    version: Deno.args[0],
  },
  postBuild() {
    // steps to run after building and before running the tests
    for (const fileName of ["LICENSE", "README.md"]) {
      Deno.copyFileSync(fileName, "npm/" + fileName);
    }
  },
  shims: {
    deno: "dev",
  },
  rootTestDir: "./tests",
});

await Deno.writeTextFile(
  "npm/.npmignore",
  "package-lock.json\n",
  { append: true },
);
