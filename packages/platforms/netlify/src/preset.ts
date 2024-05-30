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
    description: 'always true when running on netlify',
    ...getCommonTypeInfo('build-metadata'),
  }),
  NetlifyContext: createDmnoDataType({
    extends: DmnoBaseTypes.enum(['dev', 'branch-deploy', 'deploy-preview', 'production']),
    description: 'netlify build context',
    ...getCommonTypeInfo('build-metadata'),
  }),
  NetlifyBuildId: createDmnoDataType({
    typeDescription: 'Unique ID for the netlify build',
    exampleValue: '5d4aeac2ccabf517d2f219b8',
    ...getCommonTypeInfo('build-metadata'),
  })
}

// https://docs.netlify.com/configure-builds/environment-variables/#git-metadata

export const NetlifyEnvPreset = {
  CONTEXT: NetlifyDataTypes.NetlifyContext,
  NETLIFY: NetlifyDataTypes.NetlifyIdentifier,
  BUILD_ID: NetlifyDataTypes.NetlifyBuildId,
}
