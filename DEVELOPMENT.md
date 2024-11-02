# Development

This library targets Deno:

```
deno 2.0.3 (stable, release, x86_64-pc-windows-msvc)
v8 12.9.202.13-rusty
typescript 5.6.2
```

## Setup - Windows using PowerShell

### Install Scoop

```PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Install Deno

```PowerShell
scoop install deno@2.0.3
```

Check the version:

```PowerShell
deno --version
deno 2.0.3 (stable, release, x86_64-pc-windows-msvc)
v8 12.9.202.13-rusty
typescript 5.6.2
```

Create your shell profile if it doesn't already exist:

```PowerShell
if (!(Test-Path -Path $PROFILE)) {
  New-Item -ItemType File -Path $PROFILE -Force
}
```

Install shell autocompletes:

```PowerShell
deno completions powershell >> $PROFILE
```

### Setup for Publishing to NPM

Install NodeJS v20 and NPM 10.8.2.

```PowerShell
scoop install nodejs-lts@20.18.0
npm --version
10.8.2
```

## IntelliJ Setup

- Install "File Watchers"
- Create a File Watcher called "deno fmt"
  - File type: "TypeScript"
  - Program: "deno"
  - Argument: "fmt"
  - Untick "Auto-save edited files to trigger the watcher" and "Trigger the
    watcher on external changes"
- Set file watcher as an "Action on Save"

## Deno usage

- Type check: `deno check .`
- Format (check): `deno fmt --check`
- Format (write): `deno fmt`
- Lint: `deno lint`
- Test: `deno test`

Do all checks:

```powershell
deno task check-all
```

## Publish to NPM

Change `1.2.3` to the desired version.

```PowerShell
deno task build-npm 1.2.3
```

## Build docs

```PowerShell
deno task build-docs
```
