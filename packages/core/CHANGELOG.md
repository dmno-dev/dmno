# dmno

## 0.0.15

### Patch Changes

- [#100](https://github.com/dmno-dev/dmno/pull/100) [`6b2e29f`](https://github.com/dmno-dev/dmno/commit/6b2e29fdc9250fae526d1c36dd33a2db8306d2ab) Thanks [@philmillman](https://github.com/philmillman)! - fix tsconfig in generated dmno folder stuff

## 0.0.14

### Patch Changes

- [#93](https://github.com/dmno-dev/dmno/pull/93) [`da57c5e`](https://github.com/dmno-dev/dmno/commit/da57c5e6822370e276aff271378ca264b4f848e6) Thanks [@theoephraim](https://github.com/theoephraim)! - add http interceptor to prevent leaking secrets

- [#94](https://github.com/dmno-dev/dmno/pull/94) [`533f4e6`](https://github.com/dmno-dev/dmno/commit/533f4e6dae7802f4e1f501d65aa1e1b5dcd9e3eb) Thanks [@theoephraim](https://github.com/theoephraim)! - moving settings (secret redactor and http interception) to
  settings within config, and inject behavior automatically when
  injectDmnoGlobals is called

- [#91](https://github.com/dmno-dev/dmno/pull/91) [`df6496c`](https://github.com/dmno-dev/dmno/commit/df6496c8bd77d4756ab5a6968f3b11203f43c50c) Thanks [@theoephraim](https://github.com/theoephraim)! - add tools to redact secrets from global console methods

## 0.0.13

### Patch Changes

- [#86](https://github.com/dmno-dev/dmno/pull/86) [`3a435bc`](https://github.com/dmno-dev/dmno/commit/3a435bcc95ec55ff755d6f2023b6aec2af171eab) Thanks [@theoephraim](https://github.com/theoephraim)! - improve error handling and messaging

- [#88](https://github.com/dmno-dev/dmno/pull/88) [`cacad8a`](https://github.com/dmno-dev/dmno/commit/cacad8adbcff3068767f13466c20602941c011f1) Thanks [@theoephraim](https://github.com/theoephraim)! - improvements to dmno init

## 0.0.12

### Patch Changes

- [#85](https://github.com/dmno-dev/dmno/pull/85) [`59139ee`](https://github.com/dmno-dev/dmno/commit/59139ee78154cfdaf15abfd7bc180c9ff99f11fb) Thanks [@theoephraim](https://github.com/theoephraim)! - Fix schema scaffolding bug and general scaffolding improvements

## 0.0.11

### Patch Changes

- [#84](https://github.com/dmno-dev/dmno/pull/84) [`cff6475`](https://github.com/dmno-dev/dmno/commit/cff6475e3a45418ace18cbb2851a5c133713d26e) Thanks [@theoephraim](https://github.com/theoephraim)! - spawn dmno dev using correct package manager, astro integration cleanup, dynamic item prerender warning

## 0.0.10

### Patch Changes

- [#82](https://github.com/dmno-dev/dmno/pull/82) [`0ff07e9`](https://github.com/dmno-dev/dmno/commit/0ff07e9b628e1cc1ce57c16ab5b8fc381407ac91) Thanks [@theoephraim](https://github.com/theoephraim)! - rename `load` to `resolve`, add `printenv`, add `-w` to resolve, refactor cli errors and watch mode

- [#83](https://github.com/dmno-dev/dmno/pull/83) [`f7f7612`](https://github.com/dmno-dev/dmno/commit/f7f7612c4e1041ce4640747a1c5ef92b14033347) Thanks [@theoephraim](https://github.com/theoephraim)! - respect env var public prefixes (ex: NEXT*PUBLIC*) during schema scaffold

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
