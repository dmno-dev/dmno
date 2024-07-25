import { createDmnoDataType, DmnoBaseTypes } from 'dmno';

const gitCommonTypeInfo = {
  ui: {
    icon: 'teenyicons:git-solid',
  },
};
const githubCommonTypeInfo = {
  ui: {
    icon: 'mdi:github',
  },
};

export const GitDataTypes = {
  RepoName: createDmnoDataType({
    typeLabel: 'git/repoName',
    typeDescription: 'name/slug for the repository',
    exampleValue: 'evilcorp-api',
    extends: DmnoBaseTypes.string({ matches: /^[\w-.]+$/, maxLength: 100 }),
    externalDocs: {
      description: 'Remote repositories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...gitCommonTypeInfo,
  }),
  PublicRepoUrl: createDmnoDataType({
    typeLabel: 'git/repoUrl',
    typeDescription: 'Public web address of the git repository',
    exampleValue: 'https://github.com/dmno-dev/dmno',
    externalDocs: {
      description: 'Remote repositories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...gitCommonTypeInfo,
  }),
  RemoteUrl: createDmnoDataType({
    typeLabel: 'git/remoteUrl',
    typeDescription: 'Remote URL of a git repository',
    exampleValue: 'https://github.com/dmno-dev/dmno.git',
    externalDocs: {
      description: 'Remote repositories (Github docs)',
      url: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#about-remote-repositories',
    },
    ...gitCommonTypeInfo,
  }),
  BranchName: createDmnoDataType({
    typeLabel: 'git/branchName',
    typeDescription: 'Name of a git branch',
    externalDocs: {
      description: 'Git branches (Atlassian docs)',
      url: 'https://www.atlassian.com/git/tutorials/using-branches',
    },
    ...gitCommonTypeInfo,
  }),
  CommitSha: createDmnoDataType({
    typeLabel: 'git/commitSha',
    typeDescription: 'Unique id of a specific git commit - also known as “SHA” or “hash”',
    // full SHA is 40 chars, but it is common to use shortened versions, so we may want multiple types or options
    externalDocs: {
      description: 'What are Git Hashes? (Graphite docs)',
      url: 'https://graphite.dev/guides/git-hashing',
    },
    ...gitCommonTypeInfo,
  }),
  CommitMessage: createDmnoDataType({
    typeLabel: 'git/commitMessage',
    typeDescription: 'Descriptive message describing the commit',
    ...gitCommonTypeInfo,
  }),

};


export const GithubDataTypes = {
  OrgName: createDmnoDataType({
    typeLabel: 'git/orgName',
    typeDescription: 'organization name on github',
    exampleValue: 'evilcorp',
    extends: DmnoBaseTypes.string({ matches: /^[\w-.]+$/, maxLength: 39 }),
    ...githubCommonTypeInfo,
  }),
  UserName: createDmnoDataType({
    typeLabel: 'git/username',
    typeDescription: 'username on github',
    exampleValue: 'coolcoder42',
    extends: DmnoBaseTypes.string({ matches: /^[\w-.]+$/, maxLength: 39 }),
    ...githubCommonTypeInfo,
  }),
  RepoId: createDmnoDataType({
    typeLabel: 'github/repoId',
    typeDescription: 'Repository ID on github',
    exampleValue: 12345,
    extends: DmnoBaseTypes.number({ min: 1, isInt: true }),
    ...githubCommonTypeInfo,
  }),
  // this doesn't seem to be a native concept to git itself, but all the providers have something similar?
  PullRequestId: createDmnoDataType({
    typeLabel: 'github/pullRequestId',
    typeDescription: 'Pull request ID/number on github',
    exampleValue: 123,
    extends: DmnoBaseTypes.number({ min: 1, isInt: true }),
    ...githubCommonTypeInfo,
  }),

};

