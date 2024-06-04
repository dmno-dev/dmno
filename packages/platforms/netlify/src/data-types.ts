import { DmnoBaseTypes, createDmnoDataType } from 'dmno';

function getCommonTypeInfo(anchorLink: string) {
  return {
    externalDocs: {
      url: `https://docs.netlify.com/configure-builds/environment-variables/#${anchorLink}`,
      description: 'Netlify docs',
    },
    ui: {
      icon: 'simple-icons:netlify',
      color: '01BDBA' // netlify brand
    }
  }
}

export const NetlifyDataTypes = {
  // https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  NetlifyIdentifier: createDmnoDataType({
    extends: DmnoBaseTypes.boolean,
    typeDescription: 'always true - can be used to check if the build is running on Netlify',
    ...getCommonTypeInfo('build-metadata'),
  }),
  NetlifyContext: createDmnoDataType({
    extends: DmnoBaseTypes.enum({
      'dev': {
        description: 'local development environments run using Netlify Dev'
      },
      'branch-deploy': {
        description: 'deploys from branches that are not the site’s main production branch.'
      },
      'deploy-preview': {
        description: 'previews built for pull/merge requests'
      },
      'production': {
        description: 'This main site’s deployment, attached to the Git branch you set when the site is created'
      },
    }),
    typeDescription: 'Netlify deploy context - can be used to detect if this is production or what type of staging/preview env it is',
    ...getCommonTypeInfo('build-metadata'),
    externalDocs: {
      description: 'Netlify docs - deploy contexts',
      url: 'https://docs.netlify.com/site-deploys/overview/#deploy-contexts',
    },
  }),
  NetlifyBuildId: createDmnoDataType({
    typeDescription: 'unique ID for the Netlify build',
    exampleValue: '5d4aeac2ccabf517d2f219b8',
    ...getCommonTypeInfo('build-metadata'),
  })
}

// https://docs.netlify.com/configure-builds/environment-variables/#git-metadata

export const NetlifyEnvSchema = {
  CONTEXT: NetlifyDataTypes.NetlifyContext,
  NETLIFY: NetlifyDataTypes.NetlifyIdentifier,
  BUILD_ID: NetlifyDataTypes.NetlifyBuildId,
}
