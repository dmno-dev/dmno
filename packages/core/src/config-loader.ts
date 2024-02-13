import getCallerPath from 'caller-path';

export function loadConfig(
  /** optionally pass in the filename/path of the caller - which may be necessary in some scenarios  */
  filename?: string
) {
  console.log('loading dmno config');

  console.log({
    cwd: process.cwd(),
    callerPath: getCallerPath(),
    // dirname: __dirname,
    // filename: __filename,
    filename,
    "import.meta.url": import.meta.url,
  });


  const config = {
    foo: 1,
  }

  console.log(config);

  return config;
}