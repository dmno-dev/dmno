export function getInstallationCodemods() {
  return {
    glob: 'astro.config.*',
    imports: [{
      moduleName: '@dmno/astro-integration',
      importDefaultAs: 'dmnoAstroIntegration',
    }],
    updates: [{
      symbol: 'EXPORT',
      path: ['integrations'],
      action: {
        arrayContains: 'dmnoAstroIntegration()',
      },
    }],
  };
}

