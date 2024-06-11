/**
 * Simple utility to check a URL against a list of allowed patterns
 *
 * Usually this will be something like ['api.someservice.com'] but
 * we try to provide a little more flexibility
 *
 * It's not perfect but should work well enough for now
 */
const splitPatternRegex = /(?:(.*):\/\/)?([^/]+)(\/.*)?/;

const patternRegexCache: Record<string, RegExp> = {};

function buildRegexFromDomainPattern(pattern: string) {
  const patternParts = pattern.match(splitPatternRegex);
  if (!patternParts) {
    throw new Error(`Unable to parse domain pattern - ${pattern}`);
  }
  let [,protocol, domain, path] = patternParts;

  if (protocol === '*' || !protocol) {
    protocol = '[a-z+]+';
  }
  domain = domain.replaceAll('*', '[^/]+');
  if (!path) path = '(/.*)?';
  else path = path.replaceAll('*', '.*');
  path += '(\\?.*)?';

  // NOTE - might need extra handling around port numbers?

  const regexString = `${protocol}://${domain}${path}`;

  return new RegExp(regexString, 'i');
}

export function checkUrlMatchesPattern(url: string, allowPattern: string) {
  if (allowPattern === '*') return true;
  const patternRegex = patternRegexCache[allowPattern] || buildRegexFromDomainPattern(allowPattern);
  return patternRegex.test(url);
}
export function checkUrlInAllowList(url: string, allowedList: Array<string>) {
  for (const allowedListItem of allowedList) {
    // TODO: temporarily just
    if (url.includes(allowedListItem)) return true;

    if (checkUrlMatchesPattern(url, allowedListItem)) return true;
  }
  return false;
}
