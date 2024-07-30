/**
 * Individual integrations can define codemods to apply to config files
 *
 * this test will attempt to focus on the mechanics of `updateConfigFile()` itself
 * rather than the specific integration config files. Eventually we'll
 * likely want the integration-specific tests to live in those integrations
 */
import { expect, test, describe } from 'vitest';
import { outdent } from 'outdent';
import { updateConfigFile } from './config-file-updater';

function updateConfigTest(
  source: string,
  codemodSchema: Parameters<typeof updateConfigFile>[1],
  checks: {
    contains?: Array<string>,
    notContains?: Array<string>,
  },

) {
  return async () => {
    const resultStr = await updateConfigFile(source, codemodSchema);
    checks?.contains?.forEach((checkStr) => {
      expect(resultStr).toContain(checkStr);
    });
    checks?.notContains?.forEach((checkStr) => {
      expect(resultStr).not.toContain(checkStr);
    });
  };
}


describe('imports', () => {
  test('default import', updateConfigTest('', {
    imports: [{ importDefaultAs: 'fooDefault', moduleName: 'foo' }],
  }, {
    contains: ["import fooDefault from 'foo';"],
  }));
  test('single named import', updateConfigTest('', {
    imports: [{ importVars: ['foo1'], moduleName: 'foo' }],
  }, {
    contains: ["import { foo1 } from 'foo';"],
  }));
  test('multiple named imports', updateConfigTest('', {
    imports: [{ importVars: ['foo1', 'foo2'], moduleName: 'foo' }],
  }, {
    contains: ["import { foo1, foo2 } from 'foo';"],
  }));
  test('default and named imports', updateConfigTest('', {
    imports: [{ importDefaultAs: 'fooDefault', importVars: ['foo1', 'foo2'], moduleName: 'foo' }],
  }, {
    contains: ["import fooDefault, { foo1, foo2 } from 'foo';"],
  }));
  test('multiple module imports', updateConfigTest('', {
    imports: [
      { importDefaultAs: 'fooDefault', moduleName: 'foo' },
      { importDefaultAs: 'barDefault', moduleName: 'bar' },
    ],
  }, {
    contains: [
      "import fooDefault from 'foo';",
      "import barDefault from 'bar';",
    ],
  }));
});

describe('update - arrayContains', () => {
  describe('normal case', () => {
    test('export object', updateConfigTest(outdent`
      export default {
        plugins: [
          otherPlugin(),
        ],
      }
    `, {
      updates: [{ symbol: 'EXPORT', path: ['plugins'], action: { arrayContains: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default {
          plugins: [
            dmnoPlugin(),
            otherPlugin(),
          ],
        }
      `],
    }));

    test('export defineConfig function', updateConfigTest(outdent`
      export default defineConfig({
        plugins: [
          otherPlugin(),
        ],
      });
    `, {
      updates: [{ symbol: 'EXPORT', path: ['plugins'], action: { arrayContains: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default defineConfig({
          plugins: [
            dmnoPlugin(),
            otherPlugin(),
          ],
        });
      `],
    }));
  });

  describe('edge cases', () => {
    test('empty object', updateConfigTest('export default {}', {
      updates: [{ symbol: 'EXPORT', path: ['p'], action: { arrayContains: 'foo()' } }],
    }, {
      contains: ['export default { p: [foo()] }'],
    }));
    test('non-empty object, path non-existant', updateConfigTest('export default { a: 1 }', {
      updates: [{ symbol: 'EXPORT', path: ['p'], action: { arrayContains: 'foo()' } }],
    }, {
      contains: ['export default { a: 1, p: [foo()] }'],
    }));
    test('non-empty object, path non-existant - multi-line', updateConfigTest(
      outdent`
        export default {
          a: 1,
        }`,
      {
        updates: [{ symbol: 'EXPORT', path: ['p'], action: { arrayContains: 'foo()' } }],
      },
      {
        contains: [outdent`
          export default {
            a: 1,
            p: [foo()],
          }`],
      },
    ));
    test('array empty', updateConfigTest('export default { p: [] }', {
      updates: [{ symbol: 'EXPORT', path: ['p'], action: { arrayContains: 'foo()' } }],
    }, {
      contains: ['export default { p: [foo()] }'],
    }));
    test('array not empty', updateConfigTest('export default { p: [1] }', {
      updates: [{ symbol: 'EXPORT', path: ['p'], action: { arrayContains: 'foo()' } }],
    }, {
      contains: ['export default { p: [foo(), 1] }'],
    }));
  });
});



describe('update - wrapWithFn', () => {
  describe('normal case', () => {
    test('export default obj', updateConfigTest(outdent`
      export default someObj
    `, {
      updates: [{ symbol: 'EXPORT', action: { wrapWithFn: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default dmnoPlugin()(someObj)
      `],
    }));

    test('module.exports', updateConfigTest(outdent`
      module.exports = someObj
    `, {
      updates: [{ symbol: 'EXPORT', action: { wrapWithFn: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        module.exports = dmnoPlugin()(someObj)
      `],
    }));

    test('export function', updateConfigTest(outdent`
      export default async () => {}
    `, {
      updates: [{ symbol: 'EXPORT', action: { wrapWithFn: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default dmnoPlugin()(async () => {})
      `],
    }));
  });

  describe('noop cases', () => {
    test('noop', updateConfigTest(outdent`
      export default dmnoPlugin()(someObj)
    `, {
      updates: [{ symbol: 'EXPORT', action: { wrapWithFn: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default dmnoPlugin()(someObj)
      `],
    }));

    test('noop w/ existing options', updateConfigTest(outdent`
      export default dmnoPlugin({ someOption: true })(someObj)
    `, {
      updates: [{ symbol: 'EXPORT', action: { wrapWithFn: 'dmnoPlugin()' } }],
    }, {
      contains: [outdent`
        export default dmnoPlugin({ someOption: true })(someObj)
      `],
    }));
  });
});
