import { DmnoCommand } from '../lib/dmno-command';
import { Completion } from 'tab';

//TODO: this must be set to hidden.
const completeCmd = new DmnoCommand('complete')
  .summary('Autocompletion')
  .description('Internal command for shell autocompletion (do not use directly).')
  .argument('<tokens...>', 'Tokens for autocompletion')
  .example('dmno complete resolve --f', 'Provide suggestions for the "resolve" command when typing "--f"')
  .passThroughOptions();

completeCmd.action(async (tokens: string[]): Promise<void> => {

  const completion = new Completion();

  // we get the root command to access all the registered commands.
  const parent = completeCmd.parent;
  if (parent && parent.commands) {
    // in this step, we add each command
    for (const cmd of parent.commands) {
      const cmdName = cmd.name();
      const cmdDescription = cmd.description() || '';

      completion.addCommand(
        cmdName,
        '',
        [], // here we can define positional args to return.
        async () => {
          return [];
        }
      );
    }

    // here, for each command we add all its options.
    for (const cmd of parent.commands) {
      const cmdName = cmd.name();
      if (Array.isArray(cmd.options)) {
        for (const option of cmd.options) {
          // console.log('HERE', cmdName, option.long);
          completion.addOption(
            cmdName,
            option.long,
            "",
            async (previousArgs, toComplete, endsWithSpace) => {
              // here we can define suggestions to return.
              if (option.long === '--format') {
                return [
                  { value: 'json', description: 'Output as JSON' },
                  { value: 'env', description: 'Output as ENV file' }
                ];
              }
              if (option.long === '--watch') {
                return [
                  { value: 'true', description: 'Enable watch mode' },
                  { value: 'false', description: 'Disable watch mode' }
                ];
              }
              return []
            }
          );
        }
      }
    }
  }

  const tokenStrings = tokens.map(token => token.toString());
  await completion.parse(tokenStrings);
  process.exit(0);
});

export default completeCmd;
export { completeCmd as CompleteCommand };
