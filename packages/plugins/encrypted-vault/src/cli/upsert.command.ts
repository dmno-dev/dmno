import fs from 'node:fs';
import { execSync } from 'node:child_process';
import _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import { kleur, createDmnoPluginCliCommand, Option } from 'dmno/cli-lib';

import { confirm, input, select } from '@inquirer/prompts';

import { encrypt, importDmnoEncryptionKeyString } from '@dmno/encryption-lib';
import { VaultFile } from '../lib/vault-file';
import { splitFullResolverPath } from '../lib/helpers';

const upsertOptions = [
  new Option('-k, --key <vaultKey>', 'item key within the vault, ex: serviceName!CONFIG_PATH#branchId'),
];

const upsertHandler: Parameters<typeof createDmnoPluginCliCommand>[0]['handler'] = async function (
  ctx,
  opts: {
    key?: string
  },
  command,
) {
// TODO: check plugin is in valid state
  const vaultName = ctx.plugin.inputNodes.name.resolvedValue || 'default';
  const primaryService = ctx.workspace.services[ctx.plugin.parentEntityId];

  const vaultPath = `${primaryService.path}/.dmno/${vaultName}.vault.json`;
  const vaultFileExists = fs.existsSync(vaultPath);


  // TODO: could throw some errors if a service was selected via -s but the plugin is not in that service?

  const { keyName, key } = await importDmnoEncryptionKeyString(ctx.plugin.inputNodes.key.resolvedValue as string);

  // TODO: we'll want to preserve comments, looks possible with the jsonc tool we are using!
  const vaultRaw = fs.readFileSync(vaultPath);
  const vaultObj = parseJSONC(vaultRaw.toString()) as VaultFile;


  // get list of items from the schema (or from the plugin directly somehow...)
  // let the user select from the list and then set a value

  let itemsFromConfig = _.map(ctx.plugin.usedByConfigItemResolverPaths, (fullResolverPath) => {
    return {
      existsInVault: !!vaultObj.items[fullResolverPath],
      vaultKey: fullResolverPath,
      ...splitFullResolverPath(fullResolverPath),
    };
  });

  // filter for the selected service - if one was selected on the initial command via -s
  if (ctx.selectedServiceName) {
    itemsFromConfig = _.filter(itemsFromConfig, (i) => i.serviceName === ctx.selectedServiceName);
  }

  const mode: 'upsert' | 'add' | 'update' = command.parent.args[0];
  if (mode === 'add') {
    itemsFromConfig = _.filter(itemsFromConfig, (i) => !i.existsInVault);
  } else if (mode === 'update') {
    itemsFromConfig = _.filter(itemsFromConfig, (i) => i.existsInVault);
  } else {
    itemsFromConfig = _.orderBy(itemsFromConfig, (i) => i.existsInVault);
  }



  let vaultItemKeyToUpdate: string;
  if (opts.key) {
    if (_.find(itemsFromConfig, (i) => i.vaultKey === opts.key)) {
      vaultItemKeyToUpdate = opts.key;
    } else {
      // TODO: more messaging about applied filters
      console.log(`Item key not found "${opts.key}"`);
      process.exit(1);
    }
  } else {
    if (!itemsFromConfig.length) {
      // TODO: more messaging about applied filters
      console.log('No config items to select from. Make sure you wire them up in your config first.');
      process.exit(1);
    }

    vaultItemKeyToUpdate = await select({
      message: `Which item would you like to ${mode}?`,
      choices: _.map(itemsFromConfig, (item) => {
        const existingItem = vaultObj.items[item.vaultKey];
        return {
          value: item.vaultKey,
          name: _.compact([
            existingItem ? kleur.yellow().bold('[update]') : kleur.green().bold('[insert]'),
            ` ${item.serviceName}`,
            ` > ${item.itemPath}`,
            item.resolverBranchIdPath ? ` > ${item.resolverBranchIdPath}` : '',
            existingItem ? kleur.gray(` last updated ${existingItem.updatedAt.substring(0, 10)}`) : '',
          ]).join(''),

        };
      }),
    });
  }


  const newRawValue = await input({
    message: 'Enter the new value',
  // TODO: use type validation
  // validate:
  });


  const encryptedValue = await encrypt(key, newRawValue, keyName);
  vaultObj.items[vaultItemKeyToUpdate] = {
    encryptedValue,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(vaultPath, JSON.stringify(vaultObj, null, 2));

  process.exit(0);
};

// add / update / upsert are all really the same, but we just filter the items list differently
// might be better to only support upsert?

export const UpsertItemCommand = createDmnoPluginCliCommand({
  name: 'upsert',
  summary: 'update or insert an item to your encrypted vault file',
  description: `
  upserts items...
`,
  examples: [
    {
      command: 'dmno plugin -p vault -- upsert',
      description: 'Update or insert an item to the vault',
    },
  ],
  options: upsertOptions,
  handler: upsertHandler,
});

export const AddItemCommand = createDmnoPluginCliCommand({
  name: 'add',
  summary: 'add an item to your encrypted vault file',
  description: `
  adds items...
`,
  examples: [
    {
      command: 'dmno plugin -p vault -- add',
      description: 'add an item to the vault',
    },
  ],
  options: upsertOptions,
  handler: upsertHandler,
});

export const UpdateItemCommand = createDmnoPluginCliCommand({
  name: 'update',
  summary: 'update an existing item in your encrypted vault file',
  description: `
  udpates items...
`,
  examples: [
    {
      command: 'dmno plugin -p vault -- update',
      description: 'update an item in the vault',
    },
  ],
  options: upsertOptions,
  handler: upsertHandler,
});
