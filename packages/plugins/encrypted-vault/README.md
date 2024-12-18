Check out the [docs](https://dmno.dev/docs/plugins/encrypted-vault/) for more information on how to use [DMNO](https://dmno.dev) with an encrypted vault for your secrets.


If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/encrypted-vault-plugin [![npm](https://img.shields.io/npm/v/@dmno/encrypted-vault-plugin)](https://www.npmjs.com/package/@dmno/encrypted-vault-plugin)

Provides functionality to encrypt and store secrets committed to your repo for the @dmno config engine


## Plugin

### Installation

```bash
npm add @dmno/encrypted-vault-plugin
```

### Initialization

```typescript
import { defineDmnoService, configPath } from 'dmno';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

const MyProdVault = new EncryptedVaultDmnoPlugin('vault/prod', {
  key: configPath('..', 'DMNO_VAULT_KEY'),
});


export default defineDmnoService({
  schema: {
    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
      // NOTE - the type itself is already marked as secret
    },
    // simple case example
    SUPER_SECRET_ITEM: {
      value: MyProdVault.item(),
    },
  },
});
```


### Value Resolvers

#### Fetch item using unique IDs
`myEncryptedVault.item()`

### Data Types
- `EncryptedVaultTypes.encryptionKey`

### CLI Commands

```bash
# set up a new encrypted vault
dmno plugin -p vault -- setup

# Update or insert an item to te vault
dmno plugin -p vault -- upsert

# add an item to the vault
dmno plugin -p vault -- add

# update an item in the vault
dmno plugin -p vault -- update

# delete an item from the vault
dmno plugin -p vault -- delete

# delete an item from the vault
dmno plugin -p vault -- delete
```
