import { DmnoBaseTypes, createDmnoDataType, createVendorSchema } from 'dmno';
import { GitDataTypes } from 'dmno/vendor-types';

function getCommonTypeInfo(anchorLink: string, skipIcon = false) {
  return {
    externalDocs: {
      url: `https://docs.netlify.com/configure-builds/environment-variables/#${anchorLink}`,
      description: 'Netlify docs',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:netlify',
        color: '01BDBA', // netlify brand
      },
    },
  };
}

export const NetlifyDataTypes = {
  // https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  Context: createDmnoDataType({
    typeLabel: 'netlify/context',
    extends: DmnoBaseTypes.enum({
      dev: {
        description: 'local development environments run using Netlify Dev',
      },
      'branch-deploy': {
        description: 'deploys from branches that are not the site\'s main production branch.',
      },
      'deploy-preview': {
        description: 'previews built for pull/merge requests',
      },
      production: {
        description: 'This main site\'s deployment, attached to the Git branch you set when the site is created',
      },
    }),
    typeDescription: 'Netlify deploy context - can be used to detect if this is production or what type of staging/preview env it is',
    ...getCommonTypeInfo('build-metadata'),
    externalDocs: {
      description: 'Netlify docs - deploy contexts',
      url: 'https://docs.netlify.com/site-deploys/overview/#deploy-contexts',
    },
  }),
  BuildId: createDmnoDataType({
    typeLabel: 'netlify/build-id',
    typeDescription: 'unique ID for the Netlify build',
    exampleValue: '5d4aeac2ccabf517d2f219b8',
    ...getCommonTypeInfo('build-metadata'),
  }),


  SiteName: createDmnoDataType({
    typeLabel: 'netlify/site-name',
    typeDescription: 'name of the site - also the Netlify subdomain',
    extends: DmnoBaseTypes.string(), // TODO: what are the restrictions?
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  }),

  SiteId: createDmnoDataType({
    typeLabel: 'netlify/site-id',
    typeDescription: 'unique ID for the Netlify site',
    extends: DmnoBaseTypes.uuid(),
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  }),
  DeployId: createDmnoDataType({
    typeLabel: 'netlify/deploy-id',
    typeDescription: 'unique ID for the specific Netlify deploy',
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  }),
};



export const NetlifyEnvSchema = createVendorSchema({
  // https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  CONTEXT: NetlifyDataTypes.Context,
  NETLIFY: {
    extends: 'boolean',
    description: 'can be used to check if the build is running on Netlify',
    ...getCommonTypeInfo('build-metadata'),
  },
  BUILD_ID: NetlifyDataTypes.BuildId,

  // https://docs.netlify.com/configure-builds/environment-variables/#git-metadata
  REPOSITORY_URL: {
    extends: GitDataTypes.RemoteUrl,
    description: 'URL for the git repo linked to this Netlify project',
    ...getCommonTypeInfo('git-metadata', true),
  },
  BRANCH: {
    extends: GitDataTypes.BranchName,
    ...getCommonTypeInfo('git-metadata', true),
  },
  HEAD: {
    extends: GitDataTypes.BranchName,
    description: 'name of the head branch received from a Git provider',
    ...getCommonTypeInfo('git-metadata', true),
  },
  COMMIT_REF: {
    extends: GitDataTypes.CommitSha,
    description: 'reference ID of the commit being built.',
    ...getCommonTypeInfo('git-metadata'),
  },
  CACHED_COMMIT_REF: {
    extends: GitDataTypes.CommitSha,
    description: 'reference ID of the last commit that we built before the current build\nWhen a build runs without cache, it will be the same as the COMMIT_REF',
    ...getCommonTypeInfo('git-metadata'),
  },
  PULL_REQUEST: {
    extends: 'boolean',
    description: 'whether the build is from a pull/merge request (true) or not (false)',
    ...getCommonTypeInfo('git-metadata'),
  },
  REVIEW_ID: {
    description: 'ID of the request and the Deploy Preview it generated (for example, 1211) if from a pull/merge request. These two numbers will always match. (For example, deploy-preview-12 is for PR #12 in your repository.)',
    ...getCommonTypeInfo('git-metadata'),
  },

  // https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata
  URL: {
    extends: DmnoBaseTypes.url,
    description: 'URL representing the main address to your site. It can be either a Netlify subdomain or your own custom domain if you set one; for example, https://petsof.netlify.app or https://www.petsofnetlify.com.',
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  },
  DEPLOY_URL: {
    description: 'URL representing the unique URL for an individual deploy. It starts with a unique ID that identifies the deploy',
    exampleValue: 'https://5b243e66dd6a547b4fee73ae--petsof.netlify.app',
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  },
  DEPLOY_PRIME_URL: {
    description: 'URL representing the primary URL for an individual deploy, or a group of them, like branch deploys and Deploy Previews; If you set up an automatic deploy subdomain, this URL will update.',
    exampleValue: 'https://feature-branch--petsof.netlify.app',
    ...getCommonTypeInfo('deploy-urls-and-metadata'),
  },
  DEPLOY_ID: NetlifyDataTypes.DeployId,
  SITE_NAME: NetlifyDataTypes.SiteName,
  SITE_ID: NetlifyDataTypes.SiteId,
}, { fromVendor: 'netlify' });
