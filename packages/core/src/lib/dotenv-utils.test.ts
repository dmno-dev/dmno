/**
 * We use a custom parser for dotenv files so we can preserve comments and additional data
 *
 * these are some sanity checks it is working correctly
 */
import { expect, test, describe } from 'vitest';
import { loadDotEnvIntoObject } from './dotenv-utils';

function dotEnvParserTest(
  dotEnvSource: string,
  expectedObj: Record<string, string>,
) {
  return () => {
    const obj = loadDotEnvIntoObject(dotEnvSource);
    expect(obj).toMatchObject(expectedObj);
  };
}

describe('dotenv parser', () => {
  test('simplest case', dotEnvParserTest('ITEM1=foo', { ITEM1: 'foo' }));
  test('leading newline', dotEnvParserTest('\nITEM1=foo', { ITEM1: 'foo' }));
  test('trailing newline', dotEnvParserTest('ITEM1=foo\n', { ITEM1: 'foo' }));
  test('double quotes', dotEnvParserTest('ITEM1="foo"', { ITEM1: 'foo' }));
  test('single quotes', dotEnvParserTest('ITEM1=\'foo\'', { ITEM1: 'foo' }));
  test('backticks', dotEnvParserTest('ITEM1=`foo`', { ITEM1: 'foo' }));
  test('pre-comment', dotEnvParserTest('# pre-comment!\nITEM1=foo', { ITEM1: 'foo' }));
  test('post-comment', dotEnvParserTest('ITEM1=foo # post-comment!', { ITEM1: 'foo' }));
  test('post-comment w/o spaces', dotEnvParserTest('ITEM1=foo# post-comment!', { ITEM1: 'foo' }));
  test('post-comment many spaces', dotEnvParserTest('ITEM1=foo    # post-comment!', { ITEM1: 'foo' }));
  test('multiple items', dotEnvParserTest('ITEM1=foo\nITEM2=bar', { ITEM1: 'foo', ITEM2: 'bar' }));
});
