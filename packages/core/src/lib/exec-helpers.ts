import { spawn, exec, SpawnOptions } from 'node:child_process';
import { promisify } from 'node:util';
import { createDeferredPromise } from '@dmno/ts-lib';


export class ExecError extends Error {
  constructor(
    readonly exitCode: number,
    readonly signal: NodeJS.Signals | null,
    readonly data: string = 'command gave no output',
  ) {
    super(data);
  }
}


export function spawnAsyncHelper(
  command: string,
  args: Array<string>,
  spawnOptions?: SpawnOptions,
) {
  const childProcess = spawn(command, args, spawnOptions || {});
  const spawnCompleteDeferred = createDeferredPromise<string>();

  let stdoutData: string = '';
  let stderrData: string = '';
  childProcess.stdout?.on('data', (data) => {
    stdoutData += data.toString();
  });
  childProcess.stderr?.on('data', (data) => {
    stderrData += data.toString();
  });
  childProcess.stdout?.on('error', (err) => {
    spawnCompleteDeferred.reject(err);
  });
  childProcess.stderr?.on('error', (err) => {
    spawnCompleteDeferred.reject(err);
  });
  childProcess.on('error', (err) => {
    spawnCompleteDeferred.reject(err);
  });
  childProcess.on('exit', (exitCode, signal) => {
    if (!exitCode) {
      spawnCompleteDeferred.resolve(stdoutData);
    } else {
      spawnCompleteDeferred.reject(
        new ExecError(exitCode, signal, stderrData),
      );
    }
  });

  return { childProcess, execResult: spawnCompleteDeferred.promise };
}

export async function spawnAsync(
  command: string,
  args: Array<string>,
  opts?: SpawnOptions,
) {
  const { execResult } = spawnAsyncHelper(command, args, opts);
  return execResult;
}

export const asyncExec = promisify(exec);
