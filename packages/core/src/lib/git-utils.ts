import { asyncExec } from './exec-utils';

export async function checkIsFileGitIgnored(path: string) {
  try {
    await asyncExec(`git check-ignore ${path} -q`);
    return true;
  } catch (err) {
    // `git check-ignore -q` exits with code 1 but no other error if is not ignored
    if ((err as any).stderr === '') return false;
    // otherwise we'll let it throw since something else is happening
    throw err;
  }
}
