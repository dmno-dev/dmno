PRs are always welcome. 

**First, please read our [Code of Conduct](CODE_OF_CONDUCT.md).**

If you have any questions please reach out to us on [Discord](https://chat.dmno.dev) in the #contribute channel.

## Installation

First, install `nvm`: 
- [nvm](https://github.com/nvm-sh/nvm)

Then use `nvm` to install the latest Node LTS: 
`nvm install --lts`

Then install `pnpm`
- [pnpm](https://pnpm.io/installation)

Then install deps via `pnpm`: 
`pnpm i`

## Building

Before you can run any of the projects locally, you need to build the packages since this is a monorepo with interdependencies. The packages reference each other and need their `dist/` directories to be built.

### Build all packages at once

To build all packages in the workspace:

```bash
pnpm run build
```

### Build specific packages individually

If you need to build specific packages, you can do so by navigating to the package directory and running the build command:

```bash
# Core package (required by most other packages)
cd packages/core && pnpm build

# Configraph (required by core)
cd packages/configraph && pnpm build

# Build specific integrations
cd packages/integrations/astro && pnpm build
cd packages/integrations/vite && pnpm build
cd packages/integrations/nextjs && pnpm build

# Build specific plugins
cd packages/plugins/1password && pnpm build
cd packages/plugins/encrypted-vault && pnpm build

# Build specific platforms
cd packages/platforms/cloudflare && pnpm build
cd packages/platforms/netlify && pnpm build
cd packages/platforms/vercel && pnpm build
```

### Running the docs site

After building the required packages, you can run the docs site locally:

```bash
cd packages/docs-site && pnpm run dev
```

The docs site will be available at `http://localhost:4321/`.

**Note:** If you encounter module resolution errors, it usually means a package hasn't been built yet. Check the error message to see which package is missing its `dist/` directory and build it first.

## Packages

- `packages/core` - Core package for DMNO (includes CLI) 
- `packages/docs-site` - Docs site (https://dmno.dev)
- `packages/dmno-api` - Basic api for tracking email signups

## Plugins

- `plugins/1password` - DMNO plugin for 1Password 
- `plugins/encrypted-vault` - DMNO plugin for encrypted values
- `plugins/bitwarden` - DMNO plugin for Bitwarden Secrets Manager
- `plugins/infisical` - DMNO plugin for Infisical

## Integrations
- `integrations/astro` - DMNO integration for Astro
- `integrations/vite` - DMNO integration for Vite
- `integrations/nextjs` - DMNO integration for Next.js
- `integrations/remix` - DMNO integration for Remix
- `integrations/fastify` - DMNO integration for Fastify

## Platforms  
- `platforms/netlify` - DMNO platform for Netlify
- `platforms/vercel` - DMNO platform for Vercel
- `platforms/cloudflare` - DMNO platform for Cloudflare

## libs

- `packages/encryption-lib` - Encryption library for DMNO
- `packages/ts-lib` - TypeScript utilities
- `packages/ui-lib` - UI library for DMNO

## Configs
- `packages/tsconfig` - shared TypeScript config for DMNO
- `packages/eslint-config` - shared ESLint config for DMNO




