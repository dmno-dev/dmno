import * as _ from 'lodash-es';
import { ConfigPath } from '@dmno/core';

type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;

export class OnePasswordSecretService {
  constructor(
    private serviceAccountToken: ServiceAccountToken | ConfigPath,
    private options?: {
      defaultVaultId?: VaultId | ConfigPath,
      // TODO: not sure if vault "name" is the right term here?
      defaultVaultName?: VaultName | ConfigPath
    },
  ) {
    console.log('initialized 1password plugin');
  }

  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, pathToFetch?: string ) {
    let vaultId: VaultId;
    let itemId: ItemId;
    if (_.isString(idOrIdAndVault)) {
      if (!this.options?.defaultVaultId) throw new Error('No vault ID specified');
    }
    return 'fetch 1pass by ids';

    // return `fetch - ${vaultId}/${itemId}`;
  }


  // items have a "reference" which is like a URL that includes vault, item, and path to specific data
  // however these are not necessarily stable...
  // cli command `op read "op://dev test/example/username"`
  itemByReference(referenceUrl: ReferenceUrl) {

    let fullReference = referenceUrl;
    // TODO: if reference starts with "op://" then it includes the vault
    if (!referenceUrl.startsWith('op://')) {
      if (!this.options?.defaultVaultName) {
        throw new Error('You must specify a default vault if using references names only');
      }
      // TODO: will need to prefix the reference path with the vault name when resolving
      fullReference = `op://${this.options?.defaultVaultName}/${fullReference}`;
    }

    return `fetch 1pass by reference - ${fullReference}`;
  }
}


// // can read items by id - need a vault id, item id
// // and then need to grab the specific data from a big json blob
// OnePassBackend.item('[ITEM-ID]', 'path.to.grab')

// // items have a "reference" which is like a URL that includes vault, item, and path to specific data
// // however these are not necessarily stable...
// // cli command `op read "op://dev test/example/username"`
// OnePassBackend.itemByReference("op://dev test/example/username");
