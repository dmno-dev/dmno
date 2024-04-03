import { Argument, Command } from 'commander';

// override help formatting ////////////////////////////////////////////////////////
function humanReadableArgName(arg: Argument) {
  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');
  return arg.required ? `<${nameOutput}>` : `[${nameOutput}]`;
}
export function customizeHelp(program: Command) {
  program.configureHelp({
    // see https://github.com/tj/commander.js/blob/master/lib/help.js#L136
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(' ');
      const cmdUsage = (cmd as any)._name
        + ((cmd as any)._aliases[0] ? `|${(cmd as any)._aliases[0]}` : '')
        + (cmd.options.length ? ' [options]' : '') // simplistic check for non-help option
        + (args ? ` ${args}` : '');
      return cmdUsage.replace('<external command>', '-- ...');
    },
  });
}


