Check out the [docs](https://dmno.dev/docs/plugins/encrypted-vault/) for more information on how to use [DMNO](https://dmno.dev) with an encrypted vault for your secrets.

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/encrypted-vault-plugin [![npm](https://img.shields.io/npm/v/@dmno/encrypted-vault-plugin)](https://www.npmjs.com/package/@dmno/encrypted-vault-plugin)

Provides functionality to encrypt and store secrets committed to your repo for the @dmno config engine


## Plugin

### Initialization

```typescript
const vaultPlugin = new EncryptedVaultPlugin('vault', {});
```


### Value Resolvers



### Fetch item using unique IDs
`onePassVault.item()`


### Fetch item using "reference"
`onePassVault.itemByReference()`



## Data Types
- `EncryptedVaultTypes.encryptionKey`
