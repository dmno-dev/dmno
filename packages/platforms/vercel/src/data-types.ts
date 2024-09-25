import { DmnoBaseTypes, createDmnoDataType, createVendorSchema } from 'dmno';
import { GitDataTypes, GithubDataTypes } from 'dmno/vendor-types';

export type { createDmnoDataType } from 'dmno';

function getCommonTypeInfo(skipIcon = false) {
  return {
    externalDocs: {
      url: 'https://vercel.com/docs/projects/environment-variables/system-environment-variables#system-environment-variables-overview',
      description: 'Vercel docs',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:vercel',
      },
    },
  };
}

export const VercelDataTypes = {
  // https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  Env: createDmnoDataType({
    typeLabel: 'vercel/env',
    extends: DmnoBaseTypes.enum({
      development: {
        description: 'local development environments running on the developer\'s computer',
      },
      preview: {
        description: 'staging / preview environment for branches and pull/merge requests',
      },
      production: {
        description: 'production deployment, usually linked to the site\'s primary URL',
      },
    }),
    typeDescription: 'Vercel env flag',
    ...getCommonTypeInfo(),
    externalDocs: {
      description: 'Vercel docs - deployment environments',
      url: 'https://vercel.com/docs/deployments/environments',
    },
  }),

  DeploymentId: createDmnoDataType({
    typeLabel: 'vercel/deployment-id',
    typeDescription: 'unique ID for the Vercel deployment',
    extends: DmnoBaseTypes.string({ startsWith: 'dpl_' }),
    exampleValue: 'dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3',
    ...getCommonTypeInfo(),
  }),
  EdgeNetworkRegionCode: createDmnoDataType({
    typeLabel: 'vercel/edgeNetworkRegionCode',
    description: 'Region code for Vercel\'s CDN/compute edge network',
    exampleValue: 'cdg1',
    ...getCommonTypeInfo(),
    externalDocs: {
      description: 'Vercel docs - Edge network regions',
      url: 'https://vercel.com/docs/edge-network/regions',
    },
  }),
};


export const VercelEnvSchema = createVendorSchema({
  VERCEL: {
    description: 'An indicator to show that System Environment Variables have been exposed to your project\'s Deployments.',
    extends: 'boolean',
  },

  CI: {
    description: 'An indicator that the code is running in a Continuous Integration environment (build-time only)',
    extends: 'boolean',
  },

  VERCEL_ENV: {
    extends: VercelDataTypes.Env,
  },

  // TODO: add a bare "domain" data type for these, or a setting on the URL data type
  VERCEL_URL: {
    description: 'The domain name of the generated deployment URL (does not include the protocol - "https://") NOTE: This Variable cannot be used in conjunction with Standard Deployment Protection. See Migrating to Standard Protection.',
    exampleValue: '*.vercel.app',
  },
  VERCEL_BRANCH_URL: {
    description: 'The domain name of the generated Git branch URL. The value does not include the protocol scheme https://.',
    exampleValue: '*-git-*.vercel.app',
    externalDocs: {
      description: 'Vercel docs - Generated URLS',
      url: 'https://vercel.com/docs/deployments/generated-urls#url-with-git-branch',
    },
  },
  VERCEL_PROJECT_PRODUCTION_URL: {
    description: 'A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.',
  },

  VERCEL_REGION: {
    description: 'The ID of the Region where the app is running. (run-time only)',
    extends: VercelDataTypes.EdgeNetworkRegionCode,
  },
  VERCEL_DEPLOYMENT_ID: {
    description: 'The unique identifier for the deployment, which can be used to implement Skew Protection',
    extends: VercelDataTypes.DeploymentId,
  },

  VERCEL_SKEW_PROTECTION_ENABLED: {
    description: 'When Skew Protection is enabled in Project Settings, this value is set to 1',
    extends: 'boolean',
  },

  VERCEL_AUTOMATION_BYPASS_SECRET: {
    description: 'The Protection Bypass for Automation value, if the secret has been generated in the project\'s Deployment Protection settings.',
  },

  VERCEL_GIT_PROVIDER: {
    description: 'The Git Provider the deployment is triggered from',
    exampleValue: 'github', // unclear what the full list of values is here
  },

  VERCEL_GIT_REPO_SLUG: {
    description: 'The origin repository the deployment is triggered from.',
    extends: GitDataTypes.RepoName,
  },

  VERCEL_GIT_REPO_OWNER: {
    description: 'The account that owns the repository the deployment is triggered from.',
    extends: GithubDataTypes.UserName, // TODO: should actually be some kind of "owner" which can be a user _or_ an org
  },

  VERCEL_GIT_REPO_ID: {
    description: 'The ID of the repository the deployment is triggered from',
    extends: GithubDataTypes.RepoId,
    exampleValue: 117716146,
  },

  VERCEL_GIT_COMMIT_REF: {
    description: 'The git branch of the commit the deployment was triggered by.',
    extends: GitDataTypes.BranchName,
    exampleValue: 'improve-about-page',
  },

  VERCEL_GIT_COMMIT_SHA: {
    description: 'The git SHA of the commit the deployment was triggered by.',
    extends: GitDataTypes.CommitSha,
    exampleValue: 'fa1eade47b73733d6312d5abfad33ce9e4068081',
  },

  VERCEL_GIT_COMMIT_MESSAGE: {
    description: 'The message attached to the commit the deployment was triggered by.',
    extends: GitDataTypes.CommitMessage,
    exampleValue: 'Update about page',
  },

  VERCEL_GIT_COMMIT_AUTHOR_LOGIN: {
    // unclear if this is vercel username or git(hub) username?
    description: 'The username attached to the author of the commit that the project was deployed by.',
    exampleValue: 'johndoe',
  },

  VERCEL_GIT_COMMIT_AUTHOR_NAME: {
    description: 'The name attached to the author of the commit that the project was deployed by.',
    exampleValue: 'John Doe',
  },

  VERCEL_GIT_PREVIOUS_SHA: {
    description: 'The git SHA of the last successful deployment for the project and branch. NOTE: This Variable is only exposed when an Ignored Build Step is provided. (build-time only)',
    extends: GitDataTypes.CommitSha,
    exampleValue: 'fa1eade47b73733d6312d5abfad33ce9e4068080',
  },

  VERCEL_GIT_PULL_REQUEST_ID: {
    description: 'The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.',
    // I think this is likely populated for all providers, even though it's not a git concept itself...
    extends: GithubDataTypes.PullRequestId,
  },
}, { fromVendor: 'vercel' });
