import { loadProcessDmnoEnv } from 'dmno';

await loadProcessDmnoEnv();

console.log('Checking if ENV is loaded...');
console.log('-- process.env --------------------');
console.log(process.env.API_ONLY);
console.log('-- process.dmnoEnv --------------------');
console.log(process.dmnoEnv?.API_ONLY);


