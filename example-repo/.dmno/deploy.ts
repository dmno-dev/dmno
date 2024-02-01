export const deploymentConfig = new DmnoDeploymentConfig([
  

  new NetlifyWebsite({
    name: 'website',
    outputs: {
      websiteUrl: { type: 'url' },
    }
  }),
])

