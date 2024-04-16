import { execSync } from 'child_process';

const tape = process.argv[2]; // get the argument

// construct the command
const command = `vhs ../core/src/cli/commands/tapes/${tape}.tape`;

// execute the command
execSync(command, { stdio: 'inherit' });
