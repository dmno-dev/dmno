import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import {
  ConfigValueResolver, DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
  DmnoPluginInputMap,
  ResolutionError,
  SchemaError,
  GetPluginInputTypes,
} from '@dmno/core';
import {
  decrypt, encrypt, generateEncryptionKeyString, importEncryptionKeyString,
} from '@dmno/encryption-lib';

import { EncryptedVaultTypes } from './data-types';


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

  async getRawValue() {
    if (!this.key) throw new Error('Key must be set first!');

    if (this.rawValue) return this.rawValue;
    if (!this.encryptedValue) throw new Error('item is empty');
    this.rawValue = await decrypt(this.key, this.encryptedValue);
    return this.rawValue;
  }
}

export class EncryptedVaultDmnoPlugin extends DmnoPlugin<EncryptedVaultDmnoPlugin> {
  static readonly inputSchema = {
    key: {
      description: 'the key to use to encrypt/decrypt this vault file',
      extends: EncryptedVaultTypes.encryptionKey,
      required: true,
    },
    name: {
      description: 'the name of the vault - will be used in the vault filename',
      extends: 'string',
    },
  } satisfies DmnoPluginInputSchema;

  constructor(
    inputs: DmnoPluginInputMap<typeof EncryptedVaultDmnoPlugin.inputSchema>,
  ) {
    super();
    this.setInputMap(inputs);
  }


  private vaultFilePath?: string;
  private vaultFileLoaded = false;
  private vaultItems: Record<string, EncryptedVaultItem> = {};
  private async loadVaultFile() {
    if (this.vaultFileLoaded) return;
    if (!this.service) throw new Error('Cannot load vault file unless connected to a service');
    this.vaultFilePath = `${this.service.path}/.dmno/${this.inputValues.name || 'default'}.vault.json`;
    const vaultFileRaw = await fs.promises.readFile(this.vaultFilePath, 'utf-8');
    const vaultFileObj = parseJSONC(vaultFileRaw.toString());
    console.log(vaultFileObj);
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

  hooks = {
    onInitComplete: async () => {
      this.vaultKey = await importEncryptionKeyString(this.inputValues.key);
      _.each(this.vaultItems, (vi) => {
        vi.key = this.vaultKey;
      });
    },
  };

  private vaultKey?: crypto.webcrypto.CryptoKey;
  private getVaultItem(serviceName: string, path: string) {
    const itemKey = [serviceName, path].join('!');
    return this.vaultItems[itemKey];
  }

  item() {
    return new EncryptedVaultItemResolver(this.getVaultItem);
  }
}

export class EncryptedVaultItemResolver extends ConfigValueResolver {
  icon = 'mdi:archive-lock'; // also mdi:file-lock ?
  getPreviewLabel() {
    return this.label;
  }

  private label = '';
  constructor(
    private itemGetter: (serviceName: string, path: string) => EncryptedVaultItem,
  ) {
    super();
  }

  async _resolve(ctx: ResolverContext) {
    const item = this.itemGetter(ctx.serviceName, ctx.fullPath);
    if (!item) throw new ResolutionError(`Item not found - ${ctx.serviceName} / ${ctx.fullPath}`);
    return await item.getRawValue();
  }
}


