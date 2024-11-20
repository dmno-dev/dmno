import kleur from 'kleur';

process.on('uncaughtException', (err) => {
  if (err.message.includes('Error loading shared library ld-linux-')) {
    console.log([
      '🚨 💡 🚨 💡 🚨',
      '',
      kleur.bold('uWebsockets compat issue. If you are running in Docker, try adding this line to your Dockerfile:'),
      '',
      '  RUN ln -s "/lib/libc.musl-$(uname -m).so.1" "/lib/ld-linux-$(uname -m).so.1"',
      '',
      '🚨 💡 🚨 💡 🚨',
      '',
    ].join('\n'));
  }

  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.message}`));
  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.stack}`));
  // eslint-disable-next-line no-restricted-syntax
  process.exit(1);
});
