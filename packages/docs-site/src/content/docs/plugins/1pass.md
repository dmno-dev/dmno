---
title: DMNO 1Password Sync

--- 

DMNO allows you to securely store and retrieve secrets from 1Password using their CLI. 

### Install 1Password dependencies

Make sure you've installed (and logged in to) 1Password per their instructions [here](https://developer.1password.com/docs/cli/get-started/). 

### Configure the 1Pass service

```typescript
// in this case we're leading 2 instances, one for preprod and one for prod
import {
  defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, toggleByEnv,
} from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const DevOnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.DEV_SERVICE_ACCOUNT_TOKEN'),
  { defaultVaultName: 'dev test' },
);
const ProdOnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.PROD_SERVICE_ACCOUNT_TOKEN'),
  { defaultVaultName: 'dev test' },
);
```

### Sync an item in your scheme

```typescript
export default defineConfigSchema({
  schema: {
    SECRET_EXAMPLE: {
      value: DevOnePassBackend.itemByReference('op://dev test/example/username'),
    },
    TOGGLED_EXAMPLE: {
      value: toggleByEnv({
        _default: DevOnePassBackend.itemByReference('example/username'),
        staging: DevOnePassBackend.itemByReference('example/username'),
        production: ProdOnePassBackend.itemByReference('example/username'),
      }),
    },
  },
});
```

:::tip[FYI]
This example uses `toggleByEnv`. To learn more about that, see our [helper method](/reference/config-engine/helper-methods) docs.
:::

### 1Password reference

#### `OnePasswordSecretService`

`item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, pathToFetch?: string)`

`itemByReference(referenceUrl: ReferenceUrl)`
