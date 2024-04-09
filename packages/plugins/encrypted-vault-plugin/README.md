# @dmno/encrypted-vault-plugin

Provides functionality to encrypt and store secrets committed to your repo for the @dmno config engine

### Data Types
- `EncryptedVaultTypes.encryptionKey`


### Initialization

```typescript
const vaultPlugin = new EncryptedVaultPlugin('vault', {});
```


### Value Resolvers



### Fetch item using unique IDs
`onePassVault.item()`


### Fetch item using "reference"
`onePassVault.itemByReference()`
