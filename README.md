# CLI to run scripts from package.json

## Example

Given the following scripts section in package.json:

```json
{
  "scripts": {
    "build": "tsc index.ts --outDir dist",
    "build:watch": "tsc index.ts --outDir dist --watch",
    "demo:test": "",
    "demo:test:unit": "",
    "demo:test:integration": "",
    "demo:build": ""
  }
}
```

`npm-run` will output:

![demo](https://raw.githubusercontent.com/smucode/npm-run-cli/master/demo.gif)

## Installation

`npm install -g npm-run-cli`

## Usage

`npm-run`

## Configuration

Add `.npmrunrc` to override the configuration. The default config is:

```json
{
  "delimiter": ":"
}
```
