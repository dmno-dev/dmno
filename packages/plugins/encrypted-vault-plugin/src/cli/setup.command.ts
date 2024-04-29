import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { kleur, createDmnoPluginCliCommand } from 'dmno/cli-lib';

import { confirm, select } from '@inquirer/prompts';

import { generateDmnoEncryptionKeyString } from '@dmno/encryption-lib';


export const SetupCommand = createDmnoPluginCliCommand({
  name: 'setup',
  summary: 'set up encrypted vault key and file',
  description: `
  Sets up a new encrypted vault - this means createing a key and initializing a file
`,
  async handler(ctx, opts, command) {
    // const vaultName = ctx.plugin.inputs.
    // console.dir(ctx.plugin.inputs, { depth: null });

    const vaultName = ctx.plugin.inputs.name.resolvedValue || 'default';



    if (!ctx.plugin.inputs.key.mappedToItemPath) {
      throw new Error('You must configure this plugin to set where the key will be stored');
    }

    const [, keyItemPath] = ctx.plugin.inputs.key.mappedToItemPath.split('!');


    const primaryService = ctx.workspace.services[ctx.plugin.initializedInService];



    const vaultPath = `${primaryService.path}/.dmno/${vaultName}.vault.json`;
    const vaultFileExists = fs.existsSync(vaultPath);


    if (!ctx.plugin.inputs.key.isResolved && !ctx.plugin.inputs.key.isValid) {
      console.log('Looks like you have a vault key that is not valid!');
      process.exit(1);
    }

    const vaultKeyIsSet = ctx.plugin.inputs.key.isResolved && ctx.plugin.inputs.key.isValid;


    // we have a key and a vault
    if (vaultKeyIsSet && vaultFileExists) {
      // TODO: check if everything actually is working?
      console.log([
        'Looks like this vault is already set up!',
      ].join('\n'));
      process.exit(0);

    // we have a key but vault is empty - not a normal scenario
    } else if (vaultKeyIsSet && !vaultFileExists) {
      console.log([
        'You have a key but the vault file does not exist.',
        '',
        'Either you have deleted the vault file from your repo, or you\'ve wired up an existing key from another vault. You should probably just create a new vault and key.',
      ].join('\n'));
      process.exit(1);

    // vault exists, but key is not set
    } else if (!vaultKeyIsSet && vaultFileExists) {
      console.log([
        'Your vault exists, but it looks like you dont have the key.',
        '',
        'To request it from a teammate securely, you can use the following command...',
        // TODO: push user to key request flow
      ].join('\n'));
      process.exit(1);

    // new vault case - generate new vault and key
    } else {
      console.log(kleur.red().bold('vault does not exist!'));

      console.log('You are about to create a new DMNO encrypted vault file and key.');

      const confirmed = await confirm({
        message: 'Is this correct?',
      });

      if (!confirmed) {
        console.log('change the name...');
        process.exit(1);
      }

      const keyName = `${vaultName}-${new Date().toISOString().substring(0, 10)}`;
      const keyStr = await generateDmnoEncryptionKeyString(keyName);


      const emptyVaultContents = {
        version: '0.0.1',
        keyName,
        items: {},
      };

      console.log([
        '',
        '🔐 A new dmno encryption key has been created for you which will decrypt your new vault.',
        '',
        'This key will be needed to unlock this vault, which means you will need to:',
        '- pass the key into your local config, usually via your .env.local file',
        '- pass the key into any CI/hosting/deployed environments, usually via an environment variable within their system',
        '- share this key with anyone else that will need to use the vault',
        '',
      ].join('\n'));

      const keyTransferMethod = await select({
        message: 'How would you like to receive your new encryption key?',
        choices: [
          { value: 'envlocal', name: '💾 write it directly to into your .env.local file' },
          { value: 'clipboard', name: '📋 copy directly to clipboard without displaying it' },
          { value: 'output', name: '👀 display it here in the terminal' },
        ],
      });

      console.log('');

      if (keyTransferMethod === 'envlocal') {
        const envLocalPath = `${primaryService.path}/.dmno/.env.local`;
        let createdEnvLocal = false;
        if (!fs.existsSync(envLocalPath)) {
          fs.writeFileSync(envLocalPath, [
            '# 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
            '# DO NOT COMMIT TO VERSION CONTROL',
            '# This file contains local config overrides, some of which are likely sensitive',
            '# 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
            '',
          ].join('\n'));
          createdEnvLocal = true;
        }
        fs.appendFileSync(envLocalPath, [
          '',
          `# Encrypted vault key for plugin "${vaultName}"`,
          `${keyItemPath}=${keyStr}`,
        ].join('\n'));

        // TODO: do we want to make sure the env local file is git-ignored?


        console.log([
          `🔏 Your key has been written into your ${createdEnvLocal ? '✨NEW✨ ' : ''}.env.local file at`,
          kleur.green(`> ${envLocalPath}`),
        ].join('\n'));
      } else if (keyTransferMethod === 'clipboard') {
        execSync(`echo "${keyStr}" | pbcopy`);
        console.log([
          '✅ Your key has been copied successfully to the clipboard! 📋',
        ].join('\n'));
      } else if (keyTransferMethod === 'output') {
        console.log([
          '🔑 Here is your key:',
          kleur.bold().gray(keyStr),
          '',
          `You will need to wire it into your config at the path ${kleur.magenta().bold(keyItemPath)}`,
        ].join('\n'));
      }


      // create vault file (with no items in it)
      fs.writeFileSync(vaultPath, [
        '// 🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒',
        '// 🔒 This file contains encrypted secrets and is intended to be committed into version control',
        '// 🔒 ',
        '// 🔒 See https://dmno.dev for more details',
        '// 🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒',
        '',
        JSON.stringify(emptyVaultContents, null, 2),
      ].join('\n'));



      console.log([
        '',
        '🗄️ A new (empty) vault file has been created for you at the following location:',
        kleur.blue(`> ${vaultPath} <`),
        '',
        kleur.bold('This file is safe/intended to be committed to source control!'),
        '',
        'To start adding items, run',
        kleur.magenta(`pnpm exec dmno plugin -p ${ctx.plugin.instanceName} -- add-item`),
      ].join('\n'));

      process.exit(0);
    }
  },
});
