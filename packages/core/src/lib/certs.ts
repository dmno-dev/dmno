import fs from 'node:fs';
import path from 'node:path';
import { createCA, createCert } from 'mkcert';
import { pathExists } from './fs-utils';

export async function createLocalSslCert(domain: string, certDirPath: string = '') {
  const certPath = path.join(certDirPath, 'local.crt');
  const keyPath = path.join(certDirPath, 'local.key');

  let cert: string | undefined;
  let key: string | undefined;

  if (certDirPath) {
    try {
      cert = await fs.promises.readFile(certPath, 'utf-8');
      key = await fs.promises.readFile(keyPath, 'utf-8');
    } catch (err) {
      // console.log('error...?', err);
    }
  }

  if (!cert) {
    const ca = await createCA({
      organization: 'DMNO',
      countryCode: 'CA',
      state: 'Toronto',
      locality: 'Canada',
      validity: 365,
    });

    const certPair = await createCert({
      ca: { key: ca.key, cert: ca.cert },
      domains: [domain],
      validity: 365,
    });
    cert = certPair.cert;
    key = certPair.key;

    if (certDirPath) {
      if (!await pathExists(certDirPath)) {
        await fs.promises.mkdir(certDirPath);
      }
      await fs.promises.writeFile(certPath, cert);
      await fs.promises.writeFile(keyPath, key);
      console.log('Generated local SSL cert');
    }
  }


  return {
    key, cert,
  };
}
