import { expect, test, describe } from 'vitest';
import { stringifyObjectAsEnvFile } from './env-file-helpers';

describe('stringifyObjectAsEnvFile', () => {
  test('basic', () => {
    const result = stringifyObjectAsEnvFile({ foo: 'bar', baz: 'qux' });
    expect(result).toEqual('foo="bar"\nbaz="qux"');
  });
  test('escapes backslashes', () => {
    const result = stringifyObjectAsEnvFile({ foo: 'bar\\baz' });
    expect(result).toEqual('foo="bar\\\\baz"');
  });
  test('escapes newlines', () => {
    const result = stringifyObjectAsEnvFile({ foo: 'bar\nbaz' });
    expect(result).toEqual('foo="bar\\nbaz"');
  });
  test('escapes double quotes', () => {
    const result = stringifyObjectAsEnvFile({ foo: 'bar"baz' });
    expect(result).toEqual('foo="bar\\"baz"');
  });
  test('excludes undefined values', () => {
    const result = stringifyObjectAsEnvFile({ foo: 'bar', baz: undefined, qux: 'test' });
    expect(result).toEqual('foo="bar"\nqux="test"');
  });
});
