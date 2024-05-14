export function getInstallationCodemods() {
  return {
    glob: 'next.config.*',
    imports: [{
      moduleName: '@dmno/nextjs-integration',
      importVars: ['dmnoNextConfigPlugin'],
    }],
    updates: [{
      symbol: 'EXPORT',
      action: {
        wrapWithFn: 'dmnoNextConfigPlugin()',
      },
    }],
  };
}

