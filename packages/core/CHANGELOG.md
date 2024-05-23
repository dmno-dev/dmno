# dmno

## 0.0.9

### Patch Changes

- [#80](https://github.com/dmno-dev/dmno/pull/80) [`c63c2e9`](https://github.com/dmno-dev/dmno/commit/c63c2e9f89c1c83f348bf8fed810c56c32f3d609) Thanks [@theoephraim](https://github.com/theoephraim)! - astro reload issue in single repo mode

- [#81](https://github.com/dmno-dev/dmno/pull/81) [`f16be40`](https://github.com/dmno-dev/dmno/commit/f16be4052ce4d9f6202c3d0e96f6fc1e265e6002) Thanks [@theoephraim](https://github.com/theoephraim)! - better handling of package detection, various fixes for vite integration

## 0.0.8

### Patch Changes

- [`b9a8c24`](https://github.com/dmno-dev/dmno/commit/b9a8c2452d42155b79a33ad2563d6c7d767a2344) Thanks [@theoephraim](https://github.com/theoephraim)! - fix bug for package.json with no name set

## 0.0.7

### Patch Changes

- [#77](https://github.com/dmno-dev/dmno/pull/77) [`45ba2fd`](https://github.com/dmno-dev/dmno/commit/45ba2fd2a5407594cd540940b8f313f53de113aa) Thanks [@theoephraim](https://github.com/theoephraim)! - refactor config injection to standardize between integrations

- [#79](https://github.com/dmno-dev/dmno/pull/79) [`2e7f2bd`](https://github.com/dmno-dev/dmno/commit/2e7f2bd02d2c7f8a49121d7d0d9c65e7f8063079) Thanks [@theoephraim](https://github.com/theoephraim)! - Fix dmno.meta.json and auto-install

## 0.0.6

### Patch Changes

- [#74](https://github.com/dmno-dev/dmno/pull/74) [`5d7ee8c`](https://github.com/dmno-dev/dmno/commit/5d7ee8c43a2d65e4ae7811e62ba3d2220f9ed608) Thanks [@theoephraim](https://github.com/theoephraim)! - - scaffold config.mts based on .env files and existing process.env/import.meta.env calls in code

  - multiple .env files are loaded if present (ex: .env.production)
  - dmno init also now does more to clean up / move existing .env files during dmno init

- [#71](https://github.com/dmno-dev/dmno/pull/71) [`02bc2a6`](https://github.com/dmno-dev/dmno/commit/02bc2a63c8f5e814170c08caa40e886081c40445) Thanks [@theoephraim](https://github.com/theoephraim)! - auto-install dmno integrations into config files via dmno init

## 0.0.5

### Patch Changes

- [#70](https://github.com/dmno-dev/dmno/pull/70) [`b4a0e09`](https://github.com/dmno-dev/dmno/commit/b4a0e0992ff8d0fb832e76b5aa70c2630b86fe3a) Thanks [@theoephraim](https://github.com/theoephraim)! - automatically set up typescript in dmno init

## 0.0.4

### Patch Changes

- [#69](https://github.com/dmno-dev/dmno/pull/69) [`9527262`](https://github.com/dmno-dev/dmno/commit/952726200e57055a1e753f163599167633bf09aa) Thanks [@theoephraim](https://github.com/theoephraim)! - Load `DMNO_PUBLIC_CONFIG` when using `import 'dmno/load'`

- [#66](https://github.com/dmno-dev/dmno/pull/66) [`9bc9a3d`](https://github.com/dmno-dev/dmno/commit/9bc9a3d62c687c4dba89119da1faecce42c06108) Thanks [@philmillman](https://github.com/philmillman)! - output via logUpdate

## 0.0.3

### Patch Changes

- [#65](https://github.com/dmno-dev/dmno/pull/65) [`0a9397b`](https://github.com/dmno-dev/dmno/commit/0a9397b3f65308a899fde1cf4b42c3514ab73fb2) Thanks [@theoephraim](https://github.com/theoephraim)! - installer improvements and fix plugin dmno peerDependency

- [#63](https://github.com/dmno-dev/dmno/pull/63) [`f0f7ad1`](https://github.com/dmno-dev/dmno/commit/f0f7ad1f39e7b68fbe3eb36e4d78596dde02079b) Thanks [@philmillman](https://github.com/philmillman)! - add --silent option to init

## 0.0.2

### Patch Changes

- [#60](https://github.com/dmno-dev/dmno/pull/60) [`cfb3f03`](https://github.com/dmno-dev/dmno/commit/cfb3f03a054a7733387e7149da2cbece9498ac48) Thanks [@theoephraim](https://github.com/theoephraim)! - fix picomatch version to remove peerDependency warning

- [`9bddee2`](https://github.com/dmno-dev/dmno/commit/9bddee204288fae40e748b9d8d2a345aece13eaf) Thanks [@theoephraim](https://github.com/theoephraim)! - fixing install issues for single-repo mode, yarn, and npm

## 0.0.1

### Patch Changes

- [`5e2a07b`](https://github.com/dmno-dev/dmno/commit/5e2a07b3fc9571f7eab593a2162a6fda5e987402) Thanks [@theoephraim](https://github.com/theoephraim)! - Initial publish of dmno and all 1st party plugins/integrations 🎉 ✨ 🚀!
