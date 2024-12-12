import kleur from 'kleur';

process.on('uncaughtException', (err) => {
  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.message}`));
  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.stack}`));
  // eslint-disable-next-line no-restricted-syntax
  process.exit(1);
});
