# Lynx Mapper

Type-safe, "exhaustive" object mapping, for TypeScript.

You define an "object mapper schema", per some combination of input and output
types, with one mapper function per property on the output type.

You can reuse some (or all) of your mapper functions between schemas, allowing
you to easily compose object mapper schemas.

The main class is `ObjectMapper`. There is also an async version,
`AsyncObjectMapper`.

Use this instead of plain functions (which can miss optional properties), or
classes.

## Docs

https://laurence-myers.github.io/lynx-mapper/
