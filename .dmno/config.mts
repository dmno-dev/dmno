import { DmnoBaseTypes, defineDmnoService, pickFromSchemaObject } from 'dmno';
import { GitDataTypes, GithubDataTypes } from 'dmno/vendor-types';

export default defineDmnoService({
  name: 'root',
  schema: {
    GITHUB_ORG_NAME: {
      extends: GithubDataTypes.OrgName,
      value: 'dmno-dev',
    },
    GITHUB_REPO_NAME: {
      extends: GitDataTypes.RepoName,
      value: 'dmno',
    },
    GITHUB_ORG_URL: {
      extends: DmnoBaseTypes.url({ allowedDomains: ['github.com'] }),
      value: () => `https://github.com/${DMNO_CONFIG.GITHUB_ORG_NAME}`,
      required: true,
    },
    GITHUB_REPO_URL: {
      extends: GitDataTypes.PublicRepoUrl,
      value: () => `${DMNO_CONFIG.GITHUB_ORG_URL}/${DMNO_CONFIG.GITHUB_REPO_NAME}`,
      required: true,
    },
    DISCORD_JOIN_URL: {
      extends: 'url',
      description: 'Link to discord',
      externalDocs: {
        description: 'discord support docs',
        url: 'https://support.discord.com/hc/en-us/articles/208866998-Invites-101',
      },
      ui: {
        icon: 'ic:baseline-discord'
      },
      value: 'https://chat.dmno.dev',
    },
    GENERAL_CONTACT_EMAIL: {
      value: 'hello@dmno.dev',
    }, 
    POSTHOG_API_KEY: {
      value: 'phc_GfztFpBHOc9S3UtvvchuPyzr1yNC0j34dexFGGykkNU',
      description: 'publishable API key for PostHog',
    },
    GITHUB_TOKEN: {
      description: 'Personal github access token, used for changesets publishing',
      sensitive: true,
    },
  }
});
