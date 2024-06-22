import { DmnoBaseTypes, createDmnoDataType, createVendorSchema } from 'dmno';
import { GitDataTypes } from 'dmno/vendor-types';

function getCommonTypeInfo(anchorLink: string, skipIcon = false) {
  return {
    externalDocs: {
      url: `https://vercel.com/docs/projects/environment-variables/system-environment-variables#${anchorLink}`,
      description: 'Vercel docs',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:vercel',
      },
    },
  }
}

export const VercelDataTypes = {
  // https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  VercelEnv: createDmnoDataType({
    typeLabel: 'vercel/env',
    extends: DmnoBaseTypes.enum({
      'development': {
        description: 'local development environments run using Netlify Dev'
      },
      'preview': {
        description: 'deploys from branches that are not the site’s main production branch.'
      },
      'production': {
        description: 'This main site’s deployment, attached to the Git branch you set when the site is created'
      },
    }),
    typeDescription: 'The Environment that the app is deployed and running on.',
    ...getCommonTypeInfo('system-environment-variables'),
  }),
}



export const NetlifyEnvSchema = createVendorSchema({
  // https://vercel.com/docs/projects/environment-variables/system-environment-variables#system-environment-variables
  CONTEXT: VercelDataTypes.VercelEnv,
  VERCEL: {
    extends: 'boolean',
    description: 'can be used to check if the build is running on Vercel',
    ...getCommonTypeInfo('system-environment-variables'),
  },
}, { fromVendor: 'netlify' });
