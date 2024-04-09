import fs from 'node:fs';
import { execSync } from 'node:child_process';
import _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import { kleur, createDmnoPluginCliCommand } from '@dmno/core/cli-lib';

import { confirm, input, select } from '@inquirer/prompts';

import {
  decrypt, encrypt, generateDmnoEncryptionKeyString, importDmnoEncryptionKeyString,
} from '@dmno/encryption-lib';
import { VaultFile } from '../lib/vault-file';
import { splitFullResolverPath } from '../lib/helpers';



export const RotateKeyCommand = createDmnoPluginCliCommand({
  name: 'rotate-key',
  summary: 'generate new encryption key and re-encrypt vault',
  description: `
  Generate a new encryption key and re-encrypt all of the secrets with it
`,
  async handler(ctx, opts, command) {
    // TODO: check plugin is in valid state
    const vaultName = ctx.plugin.inputs.name.resolvedValue || 'default';
    const primaryService = ctx.workspace.services[ctx.plugin.initializedInService];

    if (ctx.selectedServiceName) {
      console.log('Running this command will affect the entire vault - do not select a specific service');
      process.exit(1);
    }

    const vaultPath = `${primaryService.path}/.dmno/${vaultName}.vault.json`;
    const vaultFileExists = fs.existsSync(vaultPath);
    const vaultKeyIsSet = ctx.plugin.inputs.key.isResolved && ctx.plugin.inputs.key.isValid;

    if (!vaultFileExists) {
      console.log('Vault is not set up!');
      process.exit(1);
    }
    if (!vaultKeyIsSet) {
      console.log('Vault key is not set!');
      process.exit(1);
    }


    const currentKeyStr = ctx.plugin.inputs.key.resolvedValue;
    const { keyName, key } = await importDmnoEncryptionKeyString(currentKeyStr);

    const newKeyName = `${vaultName}-${new Date().toISOString().substring(0, 10)}`;
    const newKeyStr = await generateDmnoEncryptionKeyString(newKeyName);
    const { key: newKey } = await importDmnoEncryptionKeyString(newKeyStr);

    // TODO: we'll want to preserve comments, looks possible with the jsonc tool we are using!
    const vaultRaw = fs.readFileSync(vaultPath);
    const vaultObj = parseJSONC(vaultRaw.toString()) as VaultFile;
    for (const vaultItemKey in vaultObj.items) {
      const vaultItem = vaultObj.items[vaultItemKey];
      const decryptedValue = await decrypt(key, vaultItem.encryptedValue, keyName);
      vaultObj.items[vaultItemKey].encryptedValue = await encrypt(newKey, decryptedValue, newKeyName);
    }
    vaultObj.keyName = newKeyName;


    if (!ctx.plugin.inputs.key.mappedToItemPath) {
      throw new Error('You must configure this plugin to set where the key will be stored');
    }

    const [, keyItemPath] = ctx.plugin.inputs.key.mappedToItemPath.split('!');
    let replacedInEnvLocal = false;
    const envLocalPath = `${primaryService.path}/.dmno/.env.local`;
    if (fs.existsSync(envLocalPath)) {
      const envLocalRaw = fs.readFileSync(envLocalPath).toString();
      if (envLocalRaw.includes(currentKeyStr)) {
        fs.writeFileSync(envLocalPath, envLocalRaw.replaceAll(currentKeyStr, newKeyStr));
        replacedInEnvLocal = true;
      }
      console.log('Your vault key has been updated in your env.local file');
      console.log(`> ${envLocalPath}`);
    }

    if (!replacedInEnvLocal) {
      console.log('Your new key is');
      console.log(newKeyStr);
    }

    fs.writeFileSync(vaultPath, JSON.stringify(vaultObj, null, 2));
    console.log('Your vault has been re-encrypted with your new key');

    process.exit(0);
  },
});
