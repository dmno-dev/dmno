import os from 'node:os';
import fs from 'node:fs';
import stream from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import unzip from 'unzip-stream';


// see links on https://app-updates.agilebits.com/product_history/CLI2 for where this comes from
const SUPPORT_MATRIX = {
  darwin: ['amd64', 'arm64'],
  freebsd: ['386', 'amd64', 'arm', 'arm64'],
  linux: ['386', 'amd64', 'arm', 'arm64'],
  openbsd: ['386', 'amd64', 'arm_64'],
  windows: ['386', 'amd64'],
};

async function install1passwordCli(forceVersion = 'latest') {
  let version;
  if (forceVersion === 'latest') {
    const checkVersionRequest = await fetch('https://app-updates.agilebits.com/check/1/0/CLI2/en/2.0.0/N');
    const versionJson = await checkVersionRequest.json();
    version = versionJson.version;
  } else {
    version = forceVersion;
  }

  // we install into module's folder so that pnpm will cache it (previously was putting into node_modules/.bin)
  const installToPath = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');

  if (fs.existsSync(installToPath)) {
    try {
      const installedVersion = execSync(`${installToPath} -v`).toString().trim();
      if (installedVersion === version) {
        // console.log('correct 1pass cli version already installed');
        return;
      }
    } catch (err) {
      // can fail silently since we will re-install below
    }
  }



  const platform = os.platform();
  let arch = os.arch();
  if (arch === 'x64') arch = 'amd64'; // netlify build servers are x64
  if (!(SUPPORT_MATRIX)[platform]) {
    throw new Error(`Unsupported platform - ${platform}`);
  }

  if (!(SUPPORT_MATRIX)[platform].includes(arch)) {
    throw new Error(`Unsupported architecture - ${platform}/${arch}`);
  }

  const zipReq = await fetch(`https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_${platform}_${arch}_v${version}.zip`);

  if (!zipReq.body) {
    throw new Error('fetching op cli zip failed');
  }


  fs.openSync(installToPath, 'w', 0o755);

  // pipe the response stream through unzip
  // and write the `op` cli to our node_modules/.bin folder
  stream.Readable.fromWeb(zipReq.body)
    .pipe(unzip.Parse())
    .pipe(new stream.Transform({
      objectMode: true,
      transform(entry, e, cb) {
        if (entry.type === 'File' && entry.path === 'op') {
          entry.pipe(fs.createWriteStream(installToPath, { mode: 0o755 }))
            .on('finish', cb);
        } else if (entry.type === 'File' && entry.path === 'op.sig') {
          // TODO: check signature
          entry.autodrain();
          cb();
        } else {
          entry.autodrain();
          cb();
        }
      },
    }));
}

await install1passwordCli();

