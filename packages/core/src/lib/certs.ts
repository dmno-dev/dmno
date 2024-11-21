// many mTLS examples led to certs that did not actually work in the browser
// this code was heavily inspired by https://github.com/BenEdridge/mutual-tls
// which actually gives good complete examples that work

import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';
import { pathExists } from './fs-utils';


const { pki } = forge;

type CertSubjects = Array<forge.pki.CertificateField>;
type CertConfig = {
  attrs: CertSubjects,
  extensions?: Array<any>,
};

const CERT_KEYSIZE = 2048;
// TODO: do we want to let you use a non localhost host?
const CERT_HOST = 'localhost';
// TODO: do we want to let the user pick the password? Or use none?
const CERT_PASS = 'password';

async function loadCertPem(certDirPath: string, prefix: string, isKey = false) {
  return fs.promises.readFile(path.join(certDirPath, `${prefix}${isKey ? '_key.pem' : '.crt'}`), 'utf8');
}

export async function loadOrCreateTlsCerts(domain: string, certDirPath: string) {
  try {
    const clientKey = await loadCertPem(certDirPath, 'CLIENT', true);
    const clientCert = await loadCertPem(certDirPath, 'CLIENT', false);
    const serverKey = await loadCertPem(certDirPath, 'SERVER', true);
    const serverCert = await loadCertPem(certDirPath, 'SERVER', false);
    const caCert = await loadCertPem(certDirPath, 'CA', false);

    // console.log('loaded existing tls certs');
    return {
      clientKey,
      clientCert,
      serverKey,
      serverCert,
      caCert,
    };
  } catch (err) {
    // console.log('generating new tls certs');
    return createTlsCerts(domain, certDirPath);
  }
}

const CA: CertConfig = Object.freeze({
  attrs: [
    {
      name: 'commonName',
      value: 'DMNO Local Certificate Authority',
    },
    {
      name: 'countryName',
      value: 'US',
    },
    {
      shortName: 'ST',
      value: 'Virginia',
    },
    {
      name: 'localityName',
      value: 'Blacksburg',
    },
    {
      name: 'organizationName',
      value: 'CA LTD',
    },
    {
      shortName: 'OU',
      value: 'Local Cert Auth',
    },
  ],
  extensions: [
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 6, // URI
          value: 'http://localhost',
        },
        {
          type: 7, // IP
          ip: '127.0.0.1',
        },
      ],
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ],
});

const SERVER: CertConfig = Object.freeze({
  attrs: [{
    name: 'commonName',
    value: CERT_HOST,
  }, {
    name: 'countryName',
    value: 'US',
  }, {
    shortName: 'ST',
    value: 'Virginia',
  }, {
    name: 'localityName',
    value: 'Blacksburg',
  }, {
    name: 'organizationName',
    value: CERT_HOST,
  }, {
    shortName: 'OU',
    value: CERT_HOST,
  }],
  extensions: [
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 6, // URI
          value: 'http://localhost',
        },
        {
          type: 7, // IP
          ip: '127.0.0.1',
        },
      ],
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ],
});

const CLIENT = Object.freeze({
  attrs: [{
    name: 'commonName',
    value: 'dmno.dev local client cert',
  }, {
    name: 'countryName',
    value: 'US',
  }, {
    shortName: 'ST',
    value: 'Virginia',
  }, {
    name: 'localityName',
    value: 'Blacksburg',
  }, {
    name: 'organizationName',
    value: 'test client',
  }, {
    shortName: 'OU',
    value: 'dmno.dev local client cert',
  }],
});



let counter = 1;
function buildCert(
  certDirPath: string,
  prefix: string,
  config: CertConfig,
  issuer?: CertConfig,
  signer?: forge.pki.rsa.KeyPair,
) {
  console.log('Building ', prefix, ' ...');
  const kp = pki.rsa.generateKeyPair(CERT_KEYSIZE);
  const cert = pki.createCertificate();
  cert.publicKey = kp.publicKey;

  // NOTE: serialNumber is the hex encoded value of an ASN.1 INTEGER.
  // Conforming CAs should ensure serialNumber is: no more than 20 octets,  non-negative (prefix a '00' if your value starts with a '1' bit)
  // cert.serialNumber = `00${crypto.randomBytes(4).toString('hex')}`;
  cert.serialNumber = `00${counter++}`;

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setSubject(config.attrs);

  // Set the CA.attrs as an issuer for both server and client
  if (issuer) {
    cert.setIssuer(CA.attrs);
  } else {
    cert.setIssuer(config.attrs);
  }

  if (config.extensions) {
    cert.setExtensions(config.extensions);
  }

  /* optionally add more extensions
  extensions.push.apply(extensions, [{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }]);
  cert.setExtensions(extensions);
  */

  signCert(cert, kp, issuer, signer);
  writeToFile(certDirPath, prefix, cert, kp);

  return { keyPair: kp, certificate: cert };
}




function signCert(
  cert: forge.pki.Certificate,
  keyPair: forge.pki.rsa.KeyPair,
  issuer?: CertConfig,
  signer?: forge.pki.rsa.KeyPair,
) {
  if (!issuer && !signer) {
    cert.sign(keyPair.privateKey, forge.md.sha256.create());
  } else if (signer) {
    cert.sign(signer.privateKey, forge.md.sha256.create());
  } else {
    throw new Error('signer not set');
  }
}

function writeToFile(
  certDirPath: string,
  prefix: string,
  cert: forge.pki.Certificate,
  keyPair: forge.pki.rsa.KeyPair,
) {
  const pem = pki.certificateToPem(cert);
  try {
    fs.writeFileSync(`${certDirPath}/${prefix}.crt`, pem, 'utf8');
    fs.writeFileSync(`${certDirPath}/${prefix}_key.pem`, pki.privateKeyToPem(keyPair.privateKey), 'utf8');
  } catch (e) {
    console.error('Error writing files out', e);
  }
  console.log('Output files', `${certDirPath}/${prefix}.crt`, ' and ', `${certDirPath}/${prefix}_key.pem`);
}

function buildAndWriteP12(
  certDirPath: string,
  prefix: string,
  privateKey: forge.pki.rsa.PrivateKey,
  cert: forge.pki.Certificate,
  password: string | null = null,
) {
  console.log('Building P12', prefix, ' ...');
  // generate a p12 that can be imported by Chrome/Firefox/iOS
  // (requires the use of Triple DES instead of AES)
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, cert, password, { algorithm: '3des' });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(`${certDirPath}/${prefix}.p12`, der, 'binary');
  console.log(`Output file: ${certDirPath}/${prefix}.p12 with PASSWORD: ${password}`);
}


export async function createTlsCerts(domain: string, certDirPath: string) {
  if (!await pathExists(certDirPath)) {
    await fs.promises.mkdir(certDirPath);
  }

  const ca = buildCert(certDirPath, 'CA', CA);
  const client = buildCert(certDirPath, 'CLIENT', CLIENT, CA, ca.keyPair);
  const server = buildCert(certDirPath, 'SERVER', SERVER, CA, ca.keyPair);

  buildAndWriteP12(certDirPath, 'CLIENT', client.keyPair.privateKey, client.certificate, CERT_PASS);

  return {
    clientKey: pki.privateKeyToPem(client.keyPair.privateKey),
    clientCert: pki.certificateToPem(client.certificate),
    serverKey: pki.privateKeyToPem(server.keyPair.privateKey),
    serverCert: pki.certificateToPem(server.certificate),
    caCert: pki.certificateToPem(ca.certificate),
  };
}
