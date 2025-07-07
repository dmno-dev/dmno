# DMNO Development Container

This devcontainer provides a complete development environment for contributing to the DMNO project across all packages, plugins, integrations, and platforms.

## What's Included

- **Node.js 22** - Latest stable version on Debian Bookworm
- **pnpm** - Fast, disk space efficient package manager (globally installed)
- **Build Tools** - turbo, tsup, and TypeScript (globally installed)
- **VS Code Extensions**:
  - TypeScript support
  - ESLint and Prettier for code formatting
  - Astro extension for the docs site
  - Tailwind CSS support
  - Markdown and MDX support
  - YAML support

## Setup Process

The devcontainer uses a two-stage setup for optimal performance and reliability:

### 1. **onCreate** (Container-level setup - cached)
- Installs pnpm globally
- Installs build tools (turbo, tsup, TypeScript) globally
- Verifies all tools are properly installed
- Runs once and gets cached with the container image

### 2. **postCreate** (Project-level setup - runs every time)
- Validates workspace structure
- Installs all dependencies with `pnpm install`
- Builds all packages with `pnpm run build`
- Includes fallback strategies if any step fails
- Shows progress and can be debugged if needed

## Getting Started

1. **Open in VS Code**: Click the "Reopen in Container" button when VS Code detects the devcontainer
2. **Wait for setup**: The container will automatically run both setup stages
3. **Start developing**: The environment is ready for any DMNO development!

## Port Forwarding

The following ports are automatically forwarded:
- **4321** - Docs site (Astro)
- **5173** - Dev UI (Vite)
- **3000** - Example applications
- **8080** - API server

## Development Commands

```bash
# Test DMNO CLI
pnpm dmno --help

# Run docs site
cd packages/docs-site && pnpm run dev

# Run dev UI
cd packages/dev-ui && pnpm run dev

# Build all packages
pnpm run build

# Build a specific package
cd packages/<package-name> && pnpm build

# Install dependencies
pnpm install

# Run tests (if available)
pnpm test
```

## Available Packages

### Core Packages
- `packages/core` - Core DMNO functionality and CLI
- `packages/configraph` - Configuration graph library
- `packages/docs-site` - Documentation website
- `packages/dev-ui` - Development UI
- `packages/dmno-api` - API server

### Integrations
- `packages/integrations/astro` - Astro integration
- `packages/integrations/vite` - Vite integration
- `packages/integrations/nextjs` - Next.js integration
- `packages/integrations/remix` - Remix integration
- `packages/integrations/fastify` - Fastify integration

### Plugins
- `packages/plugins/1password` - 1Password plugin
- `packages/plugins/encrypted-vault` - Encrypted vault plugin
- `packages/plugins/bitwarden` - Bitwarden plugin
- `packages/plugins/infisical` - Infisical plugin

### Platforms
- `packages/platforms/netlify` - Netlify platform support
- `packages/platforms/vercel` - Vercel platform support
- `packages/platforms/cloudflare` - Cloudflare platform support

## Development Workflow

1. **Make changes** to any package
2. **Build dependencies** if you modified a package that others depend on
3. **Test your changes** by running the relevant dev servers or examples
4. **Submit a PR** following the contribution guidelines

## Troubleshooting

### Common Issues

#### 1. `Cannot find module '@dmno/tsconfig/tsconfig.node.json'`

**Cause**: This happens when packages with workspace dependencies try to build before the workspace is properly linked.

**Solution**:
```bash
# Run the quick setup script
bash .devcontainer/quick-setup.sh

# Or manually build in dependency order:
cd packages/tsconfig && pnpm build  # Config packages first
cd packages/configraph && npx pnpm build  # Use npx for workspace deps
cd packages/core && npx pnpm build
```

**Why this works**: Using `npx pnpm build` ensures the build happens in the workspace context where workspace dependencies are properly resolved.

#### 2. `pnpm install` hangs or fails

**Cause**: Network issues, registry problems, or interactive prompts in non-interactive environment.

**Solution**:
```bash
# Set non-interactive environment
export CI=true

# Try alternative install methods
pnpm install --ignore-scripts --no-optional
# or
pnpm install --frozen-lockfile=false --force
```

#### 3. Global tools not found (`turbo`, `tsup`, etc.)

**Cause**: Tools weren't installed in the onCreate phase or installation failed.

**Solution**:
```bash
# Install missing tools
npm install -g turbo@latest tsup@latest typescript@latest

# Verify installation
turbo --version
tsup --version
tsc --version
```

#### 4. Build fails with "Local package.json exists, but node_modules missing"

**Cause**: Package-level node_modules weren't installed properly.

**Solution**:
```bash
# Force reinstall from workspace root
pnpm install --force

# Or reinstall specific package
cd packages/failing-package
pnpm install
```

#### 5. Workspace packages can't find each other

**Cause**: Workspace linking isn't working properly.

**Solution**:
```bash
# Verify workspace structure
pnpm list --depth=0

# Check if packages are properly linked
ls -la packages/tsconfig/  # Should show config files
ls -la packages/configraph/node_modules/@dmno/  # Should show linked packages
```

## Package Dependencies

Understanding the dependency order helps with troubleshooting:

### Configuration Packages (no dependencies)
- `@dmno/tsconfig` - TypeScript configurations
- `@dmno/eslint-config` - ESLint configurations  

### Core Libraries (minimal dependencies)
- `@dmno/encryption-lib` - Encryption utilities
- `@dmno/ts-lib` - TypeScript utilities
- `@dmno/ui-lib` - UI components

### Engine Packages (depend on config + core)
- `@dmno/configraph` - Configuration graph engine
- `@dmno/core` - Main DMNO engine

### Integrations (depend on core)
- `@dmno/vite-integration`
- `@dmno/astro-integration`
- `@dmno/nextjs-integration`
- `@dmno/remix-integration`
- `@dmno/fastify-integration`

### Plugins (depend on core)
- `@dmno/encrypted-vault-plugin`
- `@dmno/1password-plugin`
- `@dmno/bitwarden-plugin`
- `@dmno/infisical-plugin`

### Platforms (depend on core)
- `@dmno/netlify-platform`
- `@dmno/vercel-platform`
- `@dmno/cloudflare-platform`

**Build Rule**: Always build packages in dependency order. Configuration packages first, then core libraries, then everything else.

## Performance Benefits

- **Faster rebuilds**: Global tools are cached with the container
- **Better debugging**: Project setup is visible and can be troubleshooted
- **Consistent environment**: Always uses Node 22 on Debian Bookworm
- **Complete workspace**: All packages are built and ready for development
- **Robust error handling**: Multiple fallback strategies for common issues

## More Information

- See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines
- Join the [Discord](https://chat.dmno.dev) for questions and support
- Check out the [docs](https://dmno.dev/docs) for more information about DMNO 