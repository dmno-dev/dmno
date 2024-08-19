Check out the [docs](https://dmno.dev/docs/plugins/1password/) for more information on how to use [DMNO](https://dmno.dev) with [1Password](https://1password.com/).

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/1password-plugin [![npm](https://img.shields.io/npm/v/@dmno/1password-plugin)](https://www.npmjs.com/package/@dmno/1password-plugin)

Securely use your secrets and data from 1password within DMNO Config Engine.

## Plugin

### Initialization

```typescript
const onePassVault = new OnePasswordDmnoPlugin('1pass');
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
