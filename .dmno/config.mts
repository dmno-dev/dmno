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
      extends: 'url',
      value: (ctx) => `https://github.com/${DMNO_CONFIG.GITHUB_ORG_NAME}`,
      required: true,
    },
    GITHUB_REPO_URL: {
      extends: 'url',
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
      value: 'https://discord.gg/Q9GW2PzD',
      required: true,
    },
    GENERAL_CONTACT_EMAIL: {
      value: 'hello@dmno.dev',
    }
  }
});
