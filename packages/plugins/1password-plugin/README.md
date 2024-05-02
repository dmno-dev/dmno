# @dmno/1password-plugin

Provides 1password integration for the @dmno config engine

!> This plugin uses the 1password CLI to communicate with their systems. It installs the CLI binary (locally) in a post-install hook

### Data Types
- `OnePasswordServiceAccountToken`
- `OnePasswordVaultId`
- `OnePasswordVaultName`


### Initialization

```typescript
const onePassVault = new OnePasswordDmnoPlugin('1pass');
```


### Value Resolvers



### Fetch item using unique IDs
`onePassVault.item()`


### Fetch item using "reference"
`onePassVault.itemByReference()`


Check out the [docs](https://dmno.dev/docs/guides/plugins/1password) for more information on how to use DMNO + 1Password.

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://discord.gg/Q9GW2PzD).
