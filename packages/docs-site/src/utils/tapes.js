import { execSync } from 'child_process';

const tape = process.argv[2]; 

const command = `vhs ../core/src/cli/commands/tapes/${tape}.tape`;

execSync(command, { stdio: 'inherit' });
