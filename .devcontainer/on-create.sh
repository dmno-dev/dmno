#!/bin/bash

# Exit on any error
set -e

echo "🛠️  Running container setup (onCreate)..."

# Enable corepack for package manager management
echo "📦 Enabling corepack for package management..."
if sudo corepack enable; then
  echo "✅ corepack enabled successfully"
else
  echo "❌ Failed to enable corepack"
  exit 1
fi

# Install latest pnpm using corepack
echo "📦 Installing latest pnpm using corepack..."
if sudo corepack prepare pnpm@latest --activate; then
  echo "✅ pnpm installed successfully via corepack"
else
  echo "❌ Failed to install pnpm via corepack"
  exit 1
fi

# Install common build tools globally
echo "🔧 Installing global build tools..."
if sudo npm install -g turbo@latest tsup@latest typescript@latest; then
  echo "✅ Build tools installed successfully"
else
  echo "❌ Failed to install build tools"
  exit 1
fi

# Refresh PATH to ensure tools are available
export PATH="$PATH:/usr/local/bin"
hash -r

# Verify installations with error handling
echo "🔍 Verifying installations..."
if command -v pnpm >/dev/null 2>&1; then
  echo "✅ pnpm version: $(pnpm --version)"
else
  echo "❌ pnpm not found in PATH"
  exit 1
fi

if command -v turbo >/dev/null 2>&1; then
  echo "✅ turbo version: $(turbo --version)"
else
  echo "❌ turbo not found in PATH"
  exit 1
fi

if command -v tsup >/dev/null 2>&1; then
  echo "✅ tsup version: $(tsup --version)"
else
  echo "❌ tsup not found in PATH"
  exit 1
fi

if command -v tsc >/dev/null 2>&1; then
  echo "✅ typescript version: $(tsc --version)"
else
  echo "❌ typescript not found in PATH"
  exit 1
fi

echo "✅ Container setup complete!"