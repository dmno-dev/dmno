import { DmnoBaseTypes, defineDmnoWorkspace, switchByNodeEnv, NodeEnvType } from 'dmno';

export default defineDmnoWorkspace({
  name: 'root',
  schema: {
    GITHUB_ORG_NAME: {
      value: 'dmno-dev',
      required: true,
    },
    GITHUB_REPO_NAME: {
      value: 'dmno',
      required: true,
    },
    GITHUB_ORG_URL: {
      extends: DmnoBaseTypes.url({ allowedDomains: ['github.com'] }),
      value: (ctx) => `https://github.com/${DMNO_CONFIG.GITHUB_ORG_NAME}`,
      required: true,
    },
    GITHUB_REPO_URL: {
      extends: DmnoBaseTypes.url({ allowedDomains: ['github.com'] }),
      value: (ctx) => `${DMNO_CONFIG.GITHUB_ORG_URL}/${DMNO_CONFIG.GITHUB_REPO_NAME}`,
      required: true,
    },
    DISCORD_JOIN_URL: {
      description: 'Link to discord',
      externalDocs: {
        description: 'discord support docs',
        url: 'https://support.discord.com/hc/en-us/articles/208866998-Invites-101',
      },
      extends: 'url',
      value: 'https://chat.dmno.dev',
      required: true,
    },
    GENERAL_CONTACT_EMAIL: {
      value: 'hello@dmno.dev',
    }, 
    POSTHOG_API_KEY: {
      value: 'phc_GfztFpBHOc9S3UtvvchuPyzr1yNC0j34dexFGGykkNU',
      description: 'publishable API key for PostHog',
      required: true,
    },
  },
});
