import { createDmnoDataType } from 'dmno';

const commonTypeInfo = {
  ui: {
    icon: 'mdi:github',
  },
};

export const GitDataTypes = {
  OrgName: createDmnoDataType({
    typeLabel: 'git/orgName',
    typeDescription: 'organization name on github',
    ...commonTypeInfo,
  }),
  UserName: createDmnoDataType({
    typeLabel: 'git/username',
    typeDescription: 'username on github',
    ...commonTypeInfo,
  }),
  RepoName: createDmnoDataType({
    typeLabel: 'git/repoName',
    typeDescription: '',
    externalDocs: {
      description: 'Remote repoisitories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...commonTypeInfo,
  }),
  PublicRepoUrl: createDmnoDataType({
    typeLabel: 'git/repoUrl',
    typeDescription: 'Public web address of the git repository',
    exampleValue: 'https://github.com/dmno-dev/dmno',
    externalDocs: {
      description: 'Remote repoisitories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...commonTypeInfo,
  }),
  RemoteUrl: createDmnoDataType({
    typeLabel: 'git/remoteUrl',
    typeDescription: 'Remote URL of a git repository',
    exampleValue: 'https://github.com/dmno-dev/dmno.git',
    externalDocs: {
      description: 'Remote repoisitories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...commonTypeInfo,
  }),
  BranchName: createDmnoDataType({
    typeLabel: 'git/branchName',
    typeDescription: 'Name of a git branch',
    externalDocs: {
      description: 'Git branches (Atlassian docs)',
      url: 'https://www.atlassian.com/git/tutorials/using-branches',
    },
    ...commonTypeInfo,
  }),
  CommitSha: createDmnoDataType({
    typeLabel: 'git/commitSha',
    typeDescription: 'Unique id of a specific git commit - also known as “SHA” or “hash”',
    externalDocs: {
      description: 'What are Git Hashes? (Graphite docs)',
      url: 'https://graphite.dev/guides/git-hashing',
    },
    ...commonTypeInfo,
  }),
};
