import { execSync } from 'child_process';

const tape = process.argv[2]; 

// NOTE - you must install vhs locally, which isnt available on npm...
// you can use `brew install vhs` on a mac
const command = `vhs ../core/src/cli/commands/tapes/${tape}.tape`;

execSync(command, { stdio: 'inherit' });
