/**
 * Individual integrations can define codemods to apply to config files
 */
import { expect, test, describe } from 'vitest';
import { checkUrlMatchesPattern } from './url-pattern-utils';


function patternTest(
  description: string,
  pattern: string,
  passUrls: Array<string>,
  failUrls: Array<string> = [],
) {
  return describe(`${description} - pattern = "${pattern}"`, () => {
    passUrls.forEach((url) => {
      test(`${url} - should pass`, () => {
        expect(checkUrlMatchesPattern(url, pattern)).toEqual(true);
      });
    });
    failUrls.forEach((url) => {
      test(`${url}" - should NOT pass`, () => {
        expect(checkUrlMatchesPattern(url, pattern)).toEqual(false);
      });
    });
  });
}

describe('url pattern checker', () => {
  patternTest(
    'match all wildcard',
    '*',
    ['https://example.com', 'https://subdomain.example.com', 'https://example.com/asdf', 'invalid-url'],
  );

  patternTest(
    'bare domain',
    'example.com',
    ['https://example.com', 'http://example.com'],
    ['https://subdomain.example.com', 'https://google.com'],
  );

  patternTest(
    'wildcard subdomain',
    '*.example.com',
    ['https://subdomain.example.com', 'https://multiple.subdomains.example.com'],
    ['https://example.com', 'https://google.com'],
  );

  patternTest(
    'protocol specified',
    'https://example.com',
    ['https://example.com'],
    ['http://example.com'],
  );

  patternTest(
    'protocol wildcard',
    '*://example.com',
    ['https://example.com', 'http://example.com'],
  );

  patternTest(
    'no path',
    'example.com',
    [
      'https://example.com',
      'https://example.com/',
      'https://example.com?query',
      'https://example.com/?query',
      'https://example.com/path',
      'https://example.com/path?query',
    ],
  );

  patternTest(
    'path specified',
    'example.com/api/*',
    [
      'https://example.com/api/foo',
      'https://example.com/api/foo/bar',
      'https://example.com/api/foo?query',
    ],
    [
      'https://example.com/page1',
      'https://example.com/other-api/foo',
    ],
  );

  patternTest(
    'localhost',
    'localhost',
    [
      'http://localhost:1234',
      'http://localhost:1234/foo?query',
    ],
    [
      'https://example.com/api',
    ],
  );
});
