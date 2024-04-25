import { DmnoBaseTypes, defineDmnoService, switchByNodeEnv } from 'dmno';

export default defineDmnoService({
  name: 'docs-site',
  pick: [
    'GITHUB_REPO_URL',
    'DISCORD_JOIN_URL',
    'GENERAL_CONTACT_EMAIL',
  ],
  schema: {
    GOOGLE_TAG_MANAGER_ID: {
      value: 'G-361VY1ET7B',
    }
  }
});
