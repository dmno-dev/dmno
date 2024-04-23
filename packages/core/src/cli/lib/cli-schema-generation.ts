import _ from 'lodash-es';
import { DmnoCommand } from './DmnoCommand';

// this adds a hidden command which spits out a json schema of the entire cli
export function addDocsCommand(program: DmnoCommand) {
  program
    .command('get-cli-schema', { hidden: true })
    .action(() => {
      const commandsToDocument = program.commands.filter((c) => !(c as any)._hidden);
      const commandsSchema = commandsToDocument.map((subCmd) => ({
        command: subCmd.name(),
        aliases: subCmd.aliases(),
        description: subCmd.description(),
        more: _.omit(subCmd, 'parent'),
        ...subCmd instanceof DmnoCommand && {
          examples: subCmd.examples,
        },
      }));
      console.log(JSON.stringify(commandsSchema, null, 2));
      process.exit();
    });
}
