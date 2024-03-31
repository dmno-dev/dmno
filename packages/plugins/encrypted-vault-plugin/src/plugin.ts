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
  constructor(
    private plugin: EncryptedVaultDmnoPlugin,
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


  vaultFilePath?: string;
  vaultFileLoaded = false;
  vaultItems: Record<string, EncryptedVaultItem> = {};
  async loadVaultFile() {
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
        this,
        serviceName,
        path,
        { encrypted: vaultFileItem.encryptedValue },
        new Date(vaultFileItem.updatedAt),
      );
    }
  }

  item() {
    console.log(this.inputItems);
    return new EncryptedVaultItemResolver(this);
  }
}

export class EncryptedVaultItemResolver extends ConfigValueResolver {
  icon = 'mdi:archive-lock'; // also mdi:file-lock ?
  getPreviewLabel() {
    return this.label;
  }

  private label = '';
  constructor(
    private plugin: EncryptedVaultDmnoPlugin,
    // private opts: {
    //   itemId: ItemId,
    //   vaultId?: VaultId,
    //   path?: string
    // } |
    // { reference: string },
  ) {
    super();
  }

  async _resolve(ctx: ResolverContext) {
    await this.plugin.loadVaultFile();
    // const opts = this.opts;
    console.log(this.plugin.inputItems);
    const key = await importEncryptionKeyString(this.plugin.inputValues.key);



    return 'encrypted value!';

    // if (value === undefined) {
    //   throw new ResolutionError(`unable to resolve 1pass item - ${this.label}`);
    // }
    // return value;
  }
}


