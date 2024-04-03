import { Command } from 'commander';


// createPluginCli((program, ))

const program = new Command('dmno plugin -p [pluginName] --')
  .description('@dmno/encrypted-vault-plugin cli');

const addCommand = program.command('add-item')
  .option('-f, --foo <foo>', 'which foo to bar')
  .action(async (opts) => {
    console.log('set item!', opts.foo);
  });

const initKeyCommand = program.command('init-key')
  .action(async () => {
    console.log('init new key!');
  });

await program.parseAsync();
