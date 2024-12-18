Check out the [docs](https://dmno.dev/docs/plugins/1password/) for more information on how to use [DMNO](https://dmno.dev) with [1Password](https://1password.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/1password-plugin [![npm](https://img.shields.io/npm/v/@dmno/1password-plugin)](https://www.npmjs.com/package/@dmno/1password-plugin)

Securely use your secrets and data from 1password within DMNO Config Engine.

## Plugin

### Installation

```bash
npm add @dmno/1password-plugin
```

### Example Usage

```typescript
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';

// token will be injected using types by default
const onePassSecrets = new OnePasswordDmnoPlugin('1pass');

// or you can wire up the path explicitly
const onePassSecrets2 = new OnePasswordDmnoPlugin('1passWithExplicitPath', {
  token: configPath('..', 'OP_TOKEN'),
});

export default defineDmnoService({
  schema: {
    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
      // NOTE - the type itself is already marked as sensitive 🔐
    },
  },
});
```


### Value Resolvers

### Fetch from `.env` blob
`onePassVault.item()`

### Fetch item using unique IDs
`onePassVault.itemById(vaultId, itemId, fieldId)`

### Fetch item using private link
`onePassVault.itemByLink(itemLink, fieldId)`

### Fetch item using secret reference URI
`onePassVault.itemByReference(itemReferenceUri)`


## Data Types
- `OnePasswordTypes.serviceAccountToken`
- `OnePasswordTypes.uuid`
- `OnePasswordTypes.vaultId`
- `OnePasswordTypes.itemId`
- `OnePasswordTypes.secretReferenceUri`
- `OnePasswordTypes.itemLink`
