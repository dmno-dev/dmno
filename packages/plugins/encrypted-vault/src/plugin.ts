import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import {
  DmnoPlugin,
  ResolutionError,
  DmnoConfigraphServiceEntity,
  PluginInputValue,
  DmnoService,
} from 'dmno';
import {
  decrypt, encrypt, generateEncryptionKeyString, importDmnoEncryptionKeyString,
} from '@dmno/encryption-lib';
import { name as thisPackageName, version as thisPackageVersion } from '../package.json';

import { EncryptedVaultTypes } from './data-types';

const __dirname = globalThis.__dirname ?? import.meta.dirname;
const __filename = globalThis.__filename ?? import.meta.filename;

export class EncryptedVaultItem {
  private encryptedValue?: string;
  private rawValue?: any;
  key?: crypto.webcrypto.CryptoKey;

  constructor(
    readonly serviceName: string,
    readonly path: string,
    val: { encrypted: string } | { raw: any },
    readonly updatedAt = new Date(),
  ) {
    if ('encrypted' in val) {
      this.encryptedValue = val.encrypted;
    } else {
      this.rawValue = val.raw;
    }
  }

  async getRawValue(key: crypto.webcrypto.CryptoKey, keyName: string) {
    if (this.rawValue) return this.rawValue;
    if (!this.encryptedValue) throw new Error('item is empty');
    this.rawValue = await decrypt(key, this.encryptedValue, keyName);
    return this.rawValue;
  }
}

export class EncryptedVaultDmnoPlugin extends DmnoPlugin {
  constructor(
    instanceId: string,
    inputValues: {
      name?: string,
      key: PluginInputValue,
    },
  ) {
    super(instanceId, {
      inputSchema: {
        key: {
          description: 'the key to use to encrypt/decrypt this vault file',
          extends: EncryptedVaultTypes.encryptionKey,
          required: true,
          value: inputValues.key,
        },
        name: {
          description: 'the name of the vault - will be used in the vault filename',
          extends: 'string',
          value: inputValues.name,
        },
      },
    });
  }

  static cliPath = `${__dirname}/cli/cli`;
  static pluginPackageName = thisPackageName;
  static pluginPackageVersion = thisPackageVersion;

  icon = 'mdi:archive-lock';

  // constructor(
  //   instanceName: string,
  //   inputs: DmnoPluginInputMap<typeof EncryptedVaultDmnoPlugin.inputSchema>,
  // ) {
  //   super(instanceName);
  //   this.setInputMap(inputs);
  // }


  private vaultFilePath?: string;
  private vaultFileLoaded = false;
  private vaultItems: Record<string, EncryptedVaultItem> = {};
  private async loadVaultFile() {
    const parentDmnoService = this.internalEntity?.parentEntity;
    if (!parentDmnoService) {
      throw new Error('plugin must be owned by an entity');
    }
    if (!(parentDmnoService instanceof DmnoConfigraphServiceEntity)) {
      throw new Error('parent must be a DMNO service');
    }
    const servicePath = parentDmnoService.getMetadata('path');

    const encrpytionKey = this.inputValue('key');
    if (!encrpytionKey) {
      throw new Error('encryption key must be set');
    }

    const importedKey = await importDmnoEncryptionKeyString(encrpytionKey as string);
    this.vaultKey = importedKey.key;
    this.vaultKeyName = importedKey.keyName;

    this.vaultFilePath = `${servicePath}/.dmno/${this.inputValue('name') || 'default'}.vault.json`;
    const vaultFileRaw = await fs.promises.readFile(this.vaultFilePath, 'utf-8');
    const vaultFileObj = parseJSONC(vaultFileRaw.toString());
    for (const key in vaultFileObj.items) {
      const vaultFileItem = vaultFileObj.items[key];
      const [serviceName, path] = key.split('!');
      this.vaultItems[key] = new EncryptedVaultItem(
        serviceName,
        path,
        { encrypted: vaultFileItem.encryptedValue },
        new Date(vaultFileItem.updatedAt),
      );
    }
  }

  // private hooks = {
  //   onInitComplete: async () => {
  //
  //     _.each(this.vaultItems, (vi) => {
  //       vi.key = this.vaultKey;
  //     });
  //   },
  // };

  private vaultKey?: crypto.webcrypto.CryptoKey;
  private vaultKeyName?: string;

  item() {
    return this.createResolver({
      icon: 'mdi:archive-lock', // also mdi:file-lock ?
      label: 'encrypted vault item',
      resolve: async (ctx) => {
        // probably should be triggered by some lifecycle hook rather than here?
        if (!this.vaultFileLoaded) await this.loadVaultFile();


        // console.log(ctx);

        const vaultItem = this.vaultItems[ctx.resolverFullPath];
        if (!vaultItem) throw new ResolutionError(`Item not found - ${ctx.entityId} / ${ctx.resolverFullPath}`);
        return await vaultItem.getRawValue(this.vaultKey!, this.vaultKeyName!);
      },
    });
  }
}
