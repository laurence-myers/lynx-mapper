# Lynx Mapper Changelog

## 2.0.0

### Breaking Changes

- Nested mappers, or mapper schemas constructed from spreading an existing
  mapper schema of a superset type, must return exact type matches; you will no
  longer be able to use a mapper that returns more properties than the desired
  output type.

### Features

- Add `mapFrom.pick()`, for conveniently picking input properties with the same
  name and type as the output properties.

### Fixes

- Fix ESLint warnings for unbound methods in `mapFrom` and `mapFromAsync`

### Technical Changes

- Publish to NPM using Node.js v24
- Update to Deno v2.7.14
- Update development dependencies
- Update GitHub Actions versions

## 1.0.0

- Initial Release
