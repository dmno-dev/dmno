import Debug from 'debug';
import { ResolutionError } from 'dmno';
import {
  ExecError, spawnAsync, createDeferredPromise, DeferredPromise,
} from 'dmno/utils';

const debug = Debug('dmno:1pass-plugin');

const ENABLE_BATCHING = true;

const OP_CLI_CACHE: Record<string, any> = {};

export async function execOpCliCommand(cmdArgs: Array<string>) {
  // very simple in-memory cache, will persist between runs in watch mode
  // but need to think through how a user can opt out
  // and interact with this cache from the web UI when we add it for the regular cache
  const cacheKey = cmdArgs.join(' ');
  if (OP_CLI_CACHE[cacheKey]) {
    debug('op cli cache hit!');
    return OP_CLI_CACHE[cacheKey];
  }

  const startAt = new Date();

  try {
    // uses system-installed copy of `op`
    debug('op cli command args', cmdArgs);
    const cliResult = await spawnAsync('op', cmdArgs);
    debug(`> took ${+new Date() - +startAt}ms`);
    // OP_CLI_CACHE[cacheKey] = cliResult;
    return cliResult;
  } catch (err) {
    throw processOpCliError(err);
  }
}

/**
 * help try to turn `op` errors into something more helpful
 * this is all fairly brittle though because it depends on the error messages
 * luckily it should only _improve_ the experience, and is not critical
 */
function processOpCliError(err: Error | any) {
  if (err instanceof ExecError) {
    let errMessage = err.data;
    // get rid of "[ERROR] 2024/01/23 12:34:56 " before actual message
    debug('1pass cli error --', errMessage);
    if (errMessage.startsWith('[ERROR]')) errMessage = errMessage.substring(28);
    if (errMessage.includes('authorization prompt dismissed')) {
      return new ResolutionError('1password app authorization prompt dismissed by user', {
        tip: [
          'By not using a service account token, you are relying on your local 1password installation',
          'When the authorization prompt appears, you must authorize/unlock 1password to allow access',
        ],
      });
    } else if (errMessage.includes("isn't a vault in this account")) {
      // message looks like -- "asdf" isn't a vault in this account...
      // so we will extract the vault name/id
      const matches = errMessage.match(/"([^"]+)" isn't a vault in this account/);
      const vaultNameOrId = matches?.[1] || 'unknown';
      return new ResolutionError(`1password vault "${vaultNameOrId}" not found in account connected to op cli`, {
        code: 'BAD_VAULT_REFERENCE',
        extraMetadata: { badVaultId: vaultNameOrId },
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'The account currently connected to the cli does not contain (or have access to) the selected vault',
          'This must be resolved in your terminal - try running `op whoami` to see which account is connected to your `op` cli.',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    } else if (errMessage.includes('could not find item')) {
      // message includes `"item name" isn't an item in the "vault name" vault`
      const matches = errMessage.match(/could not find item (.+) in vault (.+)/);
      const itemNameOrId = matches?.[1] || 'unknown';
      const vaultId = matches?.[2] || 'unknown';

      // const vaultNameOrId = errMessage.substring(1, errMessage.substring(1).indexOf('"') + 1);
      return new ResolutionError(`1password item "${itemNameOrId}" not found in vault "${vaultId}"`, {
        code: 'BAD_ITEM_REFERENCE',
        extraMetadata: { badItemId: itemNameOrId, vaultId },
        tip: [
          'Double check the item in your 1password vault.',
          'It is always safer to use IDs since they are more stable than names.',
        ],
      });
    } else if (errMessage.includes(' does not have a field ')) {
      // message includes `item 'dev test/example' does not have a field 'bad field name'`
      const matches = errMessage.match(/item '([^']+)' does not have a field '([^']+)'/);
      const itemNameOrId = matches?.[1] || 'unknown';
      const [vaultId, itemId] = itemNameOrId.split('/');
      const fieldNameOrId = matches?.[2]?.replace('.', '/') || 'unknown';

      // const vaultNameOrId = errMessage.substring(1, errMessage.substring(1).indexOf('"') + 1);
      return new ResolutionError(`1password vault "${vaultId}" item "${itemId}" does not have field "${fieldNameOrId}"`, {
        code: 'BAD_FIELD_REFERENCE',
        extraMetadata: { vaultId, itemId, badFieldId: fieldNameOrId },
        tip: [
          'Double check the field name/id in your item.',
        ],
        // TODO: add link to item?
      });
    }



    // when the desktop app integration is not connected, some interactive CLI help is displayed
    // however if it dismissed, we get an error with no message
    // TODO: figure out the right workflow here?
    if (!errMessage) {
      return new ResolutionError('1password cli not configured', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'You many need to enable the 1password Desktop app integration, see https://developer.1password.com/docs/cli/get-started/#step-2-turn-on-the-1password-desktop-app-integration',
          'Try running `op whoami` to make sure the cli is connected to the correct account',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    }
    return new Error(`1password cli error - ${errMessage || 'unknown'}`);
  } else if ((err as any).code === 'ENOENT') {
    return new ResolutionError('1password cli `op` not found', {
      tip: [
        'By not using a service account token, you are relying on your local 1password cli installation for ambient auth.',
        'But your local 1password cli (`op`) was not found. Install it here - https://developer.1password.com/docs/cli/get-started/',
      ],
    });
  } else {
    return new ResolutionError(`Problem invoking 1password cli: ${(err as any).message}`);
  }
}


let opReadBatch: Record<string, { deferredPromises: Array<DeferredPromise<string>> }> | undefined;
const BATCH_READ_TIMEOUT = 50;

function executeReadBatch(batchToExecute: NonNullable<typeof opReadBatch>) {
  debug('execute op read batch', Object.keys(batchToExecute));
  const envMap = {} as Record<string, string>;
  let i = 1;
  Object.keys(batchToExecute).forEach((opReference) => {
    envMap[`DMNO_1P_INJECT_${i++}`] = opReference;
  });
  const startAt = new Date();
  // `env -0` splits values by a null character instead of newlines
  // because otherwise we'll have trouble dealing with values that contain newlines
  spawnAsync('op', 'run --no-masking -- env -0'.split(' '), {
    env: {
      // have to pass through at least path so it can find `op`, but might need other items too?
      PATH: process.env.PATH!,
      // ...process.env as any,
      ...envMap,
    },
  })
    .then((result) => {
      debug(`batched OP request took ${+new Date() - +startAt}ms`);

      const lines = result.split('\0');
      for (const line of lines) {
        const eqPos = line.indexOf('=');
        const key = line.substring(0, eqPos);

        if (!envMap[key]) continue;
        const val = line.substring(eqPos + 1);
        const opRef = envMap[key];

        // resolve the deferred promises with the value
        batchToExecute[opRef].deferredPromises.forEach((p) => {
          p.resolve(val);
        });
      }
    })
    .catch((err) => {
      // have to do special handling of errors because if any IDs are no good, it kills the whole request
      const opErr = processOpCliError(err);
      debug('batch failed', opErr);
      if ((opErr as any).code === 'BAD_VAULT_REFERENCE') {
        const badId = (opErr as any).extraMetadata.badVaultId;
        debug('skipping failed bad vault id -', badId);
        for (const opRef in batchToExecute) {
          if (opRef.startsWith(`op://${badId}/`)) {
            batchToExecute[opRef].deferredPromises.forEach((p) => {
              p.reject(opErr);
            });
            delete batchToExecute[opRef];
          }
        }
      } else if ((opErr as any).code === 'BAD_ITEM_REFERENCE') {
        const badId = (opErr as any).extraMetadata.badItemId;
        debug('skipping failed bad item id -', badId);
        for (const opRef in batchToExecute) {
          const itemRef = opRef.split('/')?.[3];
          if (itemRef === badId) {
            batchToExecute[opRef].deferredPromises.forEach((p) => {
              p.reject(opErr);
            });
            delete batchToExecute[opRef];
          }
        }
      } else if ((opErr as any).code === 'BAD_FIELD_REFERENCE') {
        const badId = (opErr as any).extraMetadata.badFieldId;
        debug('skipping failed bad field id -', badId);
        for (const opRef in batchToExecute) {
          const fieldRef = opRef.split('/')?.slice(4).join('/');
          if (fieldRef === badId) {
            batchToExecute[opRef].deferredPromises.forEach((p) => {
              p.reject(opErr);
            });
            delete batchToExecute[opRef];
          }
        }
      } else {
        for (const opRef in batchToExecute) {
          batchToExecute[opRef].deferredPromises.forEach((p) => {
            p.reject(opErr);
          });
          delete batchToExecute[opRef];
        }
      }

      if (Object.keys(batchToExecute).length) {
        debug('re-executing remainder of batch', Object.keys(batchToExecute));
        executeReadBatch(batchToExecute);
      }
    });
}

/**
 * reads a single value from 1Password by reference (similar to `op read`)
 * but internally batches requests and uses `op run`
 * */
export async function opCliRead(opReference: string) {
  if (ENABLE_BATCHING) {
  // if no batch exists, we'll create it, and this function will kick it off after a timeout
    let shouldExecuteBatch = false;
    if (!opReadBatch) {
      opReadBatch = {};
      shouldExecuteBatch = true;
    }

    // otherwise we'll just add to the existing batch
    opReadBatch[opReference] ||= {
      deferredPromises: [],
    };

    const deferred = createDeferredPromise<string>();
    opReadBatch[opReference].deferredPromises.push(deferred);

    if (shouldExecuteBatch) {
      setTimeout(() => {
        if (!opReadBatch) throw Error('expected to find op read batch!');
        const batchToExecute = opReadBatch;
        opReadBatch = undefined;
        executeReadBatch(batchToExecute);
      }, BATCH_READ_TIMEOUT);
    }
    return deferred.promise;
  } else {
    // fetch each item individually
    const result = await execOpCliCommand(['read', '--force', '--no-newline', opReference]);
    return result;
  }
}

export function getIdsFromShareLink(opItemShareLinkUrl: string) {
  const url = new URL(opItemShareLinkUrl);
  const vaultId = url.searchParams.get('v')!;
  const itemId = url.searchParams.get('i')!;
  return { vaultId, itemId };
}
