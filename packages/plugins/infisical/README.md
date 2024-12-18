Check out the [docs](https://dmno.dev/docs/plugins/infisical/) for more information on how to use [DMNO](https://dmno.dev) with [Infisical](https://infisical.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/infisical-plugin [![npm](https://img.shields.io/npm/v/@dmno/infisical-plugin)](https://www.npmjs.com/package/@dmno/infisical-plugin)

Securely use your secrets and data from Infisical within DMNO Config Engine.

## Plugin

### Installation

```bash
npm add @dmno/infisical-plugin
``` 

### Example Usage

You must initialize an instance of the plugin, giving it a unique ID and wiring up the access token to its location within your config schema.

Then you can use the plugin instance which now has authentication, to fetch individual items by their name.


```typescript
import { DmnoBaseTypes, defineDmnoService, configPath, NodeEnvType, switchBy, configPath } from 'dmno';
import { InfisicalDmnoPlugin, InfisicalTypes } from '@dmno/infisical-plugin';

// automatically injects the required config items by type
const infisicalPlugin = new InfisicalDmnoPlugin('infisical', {
  environment: "dev",
});

// or you can explicitly wire it up by path, this is equivalent to the above
const infisicalPlugin2 = new InfisicalDmnoPlugin('infisical', {
  environment: "dev",
  clientId: configPath('..', 'INFISICAL_CLIENT_ID'),
  clientSecret: configPath('..', 'INFISICAL_CLIENT_SECRET'),
  projectId: configPath('..', 'INFISICAL_PROJECT_ID'),
});

export default defineDmnoService({
  schema: {
    //...
    INFISICAL_CLIENT_ID: {
      extends: InfisicalTypes.clientId,
    },
    INFISICAL_CLIENT_SECRET: {
      extends: InfisicalTypes.clientSecret,
    },
    INFISICAL_PROJECT_ID: {
      extends: InfisicalTypes.projectId,
    },
    // USES IMPLICIT CONFIG ITEM NAME, must match the name in Infisical
    ITEM_FROM_INFISICAL: {
      value: infisicalPlugin.secret()
    },
    // USES EXPLICIT NAME from Infisical
    ITEM_FROM_INFISICAL_BY_NAME: {
      value: infisicalPlugin.secret('MY_SECRET_NAME')
    },
    //...
```

Since the access token is sensitive, you'll need to populate the value of `INFISICAL_CLIENT_SECRET` using an override. For local development, you can store the machine access token in your `.dmno/.env.local` file, and in deployed environments you can set it as an environment variable.

### Value Resolvers

#### Fetch item by Name
`infisicalPlugin.secret(nameOverride)`

### Data Types
- `InfisicalTypes.clientId`
- `InfisicalTypes.clientSecret`
- `InfisicalTypes.environment`
- `InfisicalTypes.projectId`
