import { createDmnoPluginCli } from 'dmno/cli-lib';
import { SetupCommand } from './setup.command';
import { AddItemCommand, UpdateItemCommand, UpsertItemCommand } from './upsert.command';
import { DeleteItemCommand } from './delete.command';
import { RotateKeyCommand } from './rotate-key.command';

const program = createDmnoPluginCli({
  commands: [
    SetupCommand,
    UpsertItemCommand,
    AddItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    RotateKeyCommand,
  ],
});

// run the cli
await program.parseAsync();
