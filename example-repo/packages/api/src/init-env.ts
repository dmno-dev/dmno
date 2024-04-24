import path from 'path';
import dotenv from 'dotenv';

import { loadProcessDmnoEnv } from 'dmno';


// import '../.dmno/generated-types/config-hash';

import { getThisDirname } from './lib/this-file-path';

const __dirname = getThisDirname(import.meta.url);

// console.time('dmno load');
await loadProcessDmnoEnv();
// console.timeEnd('dmno load');

// console.log(process.dmnoEnv);

// // config setup inspired by vite and other similar tools
// // will replace with more feature complete config system later if we need

// const mode = (process.env.NODE_ENV || 'development').toLowerCase();
// const envFiles = [
//   // actual ENV vars override everything,
//   // then the following files in order of precedence
//   `.env.${mode}.local`, // local overrides for specific env (not recommended to use...)
//   '.env.local', // local overrides (gitignored!)
//   `.env.${mode}`, // specific env mode, ex `.env.production`
//   '.env', // defaults
// ];
// envFiles.forEach((filename) => {
//   dotenv.config({
//     path: path.resolve(`${__dirname}/../${filename}`),
//   });
// });
