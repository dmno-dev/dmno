Check out the [docs](https://dmno.dev/docs/plugins/bitwarden/) for more information on how to use [DMNO](https://dmno.dev) with [Bitwarden Secrets Manager](https://bitwarden.com/help/secrets-manager-overview/).

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/bitwarden-plugin [![npm](https://img.shields.io/npm/v/@dmno/bitwarden-plugin)](https://www.npmjs.com/package/@dmno/bitwarden-plugin)

Securely use your secrets and data from Bitwarden Secrets Manager within DMNO Config Engine.

## Plugin

### Initialization

You must initialize an instance of the plugin, giving it a unique ID and wiring up the access token to its location within your config schema.

Then you can use the plugin instance which now has authentication, to fetch individual items by their UUID.

For example:

```typescript
import { DmnoBaseTypes, defineDmnoService, configPath, NodeEnvType, switchBy, configPath } from 'dmno';
import { BitwardenSecretsManagerDmnoPlugin, BitwardenSecretsManagerTypes } from '@dmno/bitwarden-plugin';

const bwsPlugin = new BitwardenSecretsManagerDmnoPlugin('bitwarden', {
  accessToken: configPath('..', 'BWS_TOKEN'),
});

export default defineDmnoService({
  schema: {
    BWS_TOKEN: {
      extends: BitwardenSecretsManagerTypes.machineAccountAccessToken,
    },
    ITEM_FROM_BITWARDEN: {
      value: bwsPlugin.secretById('df2246f1-7889-4d1b-a18e-b219001ee3b3')
    }
    //...
```

Since the access token is sensitive, you'll need to populate the value of `BWS_TOKEN` using an override. For local development, you can store the machine access token in your `.dmno/.env.local` file, and in deployed environments you can set it as an environment variable.

### Value Resolvers

#### Fetch item by UUID
`bwsPlugin.secretById(uuid)`

### Data Types
- `BitwardenSecretsManagerTypes.machineAccountAccessToken`
- `BitwardenSecretsManagerTypes.secretId`
- `BitwardenSecretsManagerTypes.projectId`
