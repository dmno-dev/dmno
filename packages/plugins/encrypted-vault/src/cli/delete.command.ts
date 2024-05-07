import fs from 'node:fs';
import { execSync } from 'node:child_process';
import _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import { kleur, createDmnoPluginCliCommand } from 'dmno/cli-lib';

import { confirm, input, select } from '@inquirer/prompts';

import { encrypt, importDmnoEncryptionKeyString } from '@dmno/encryption-lib';
import { VaultFile } from '../lib/vault-file';
import { splitFullResolverPath } from '../lib/helpers';



export const DeleteItemCommand = createDmnoPluginCliCommand({
  name: 'delete',
  summary: 'add item(s) to your encrypted vault file',
  description: `
  adds items...
`,
  examples: [
    {
      command: 'dmno plugin -p vault -- delete',
      description: 'delete an item from the vault',
    },
  ],
  async handler(ctx, opts, command) {
    // TODO: check plugin is in valid state
    const vaultName = ctx.plugin.inputs.name.resolvedValue || 'default';
    const primaryService = ctx.workspace.services[ctx.plugin.initializedInService];

    const vaultPath = `${primaryService.path}/.dmno/${vaultName}.vault.json`;
    const vaultFileExists = fs.existsSync(vaultPath);

    const { keyName, key } = await importDmnoEncryptionKeyString(ctx.plugin.inputs.key.resolvedValue);

    // TODO: we'll want to preserve comments, looks possible with the jsonc tool we are using!
    const vaultRaw = fs.readFileSync(vaultPath);
    const vaultObj = parseJSONC(vaultRaw.toString()) as VaultFile;


    // get list of items from the schema (or from the plugin directly somehow...)
    // let the user select from the list and then set a value

    const itemsFromConfig = _.map(ctx.plugin.usedByConfigItemResolverPaths, (fullResolverPath) => {
      const [serviceName, itemAndResolverPath] = fullResolverPath.split('!');
      const [itemPath, resolverBranchIdPath] = itemAndResolverPath.split('#');

      return {
        vaultKey: fullResolverPath,
        ...splitFullResolverPath(fullResolverPath),
      };
    });

    console.log(vaultObj.items.length);
    if (_.values(vaultObj.items).length === 0) {
      console.log(kleur.red('Vault has 0 items, so there is nothing to delete'));
      process.exit(1);
    }

    const itemsInVault = _.mapValues(vaultObj.items, (vaultItem, vaultItemKey) => ({
      updatedAt: vaultItem.updatedAt,
      ...splitFullResolverPath(vaultItemKey),
    }));

    const vaultItemToDelete = await select({
      message: 'Which item would you like to delete?',
      choices: _.map(itemsInVault, (vaultItem, vaultItemKey) => {
        const itemExistsInConfig = ctx.plugin.usedByConfigItemResolverPaths?.includes(vaultItemKey);
        return {
          value: vaultItemKey,
          name: _.compact([
            itemExistsInConfig ? kleur.red().bold('[in use]') : kleur.green().bold('[unused]'),
            ` ${vaultItem.serviceName}`,
            ` > ${vaultItem.itemPath}`,
            vaultItem.resolverBranchIdPath ? ` > ${vaultItem.resolverBranchIdPath}` : '',
            kleur.gray(` last updated ${vaultItem.updatedAt.substring(0, 10)}`),
          ]).join(''),
        };
      }),
    });

    const userConfirmed = await confirm({ message: 'Are you sure you want to delete this item?' });
    if (!userConfirmed) {
      console.log('aborting...');
      process.exit(0);
    }

    delete vaultObj.items[vaultItemToDelete];

    fs.writeFileSync(vaultPath, JSON.stringify(vaultObj, null, 2));

    process.exit(0);
  },
});
