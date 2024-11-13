import { execSync, spawn } from 'child_process';
import { expect, test, describe } from 'vitest';
import { isSubshell } from './shell-helpers';

describe('isSubshell', () => {
  test('basic', () => {
    expect(isSubshell()).toBe(false);
  });
  test('subshell', () => {
    const child = spawn('bash', ['-c', 'echo $PPID $(echo $PPID)']);
    child.stdout.on('data', () => {
      expect(isSubshell()).toBe(true);
    });
  });
});
