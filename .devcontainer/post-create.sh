#!/bin/bash

# Exit on any error
set -e

# Set non-interactive environment
export CI=true

echo "🚀 Setting up DMNO workspace (postCreate)..."

# Verify we're in the right directory
if [[ ! -f "package.json" || ! -f "pnpm-workspace.yaml" ]]; then
  echo "❌ Not in DMNO workspace root. Expected package.json and pnpm-workspace.yaml"
  echo "📂 Current directory: $(pwd)"
  echo "📋 Contents:"
  ls -la
  exit 1
fi

# Ensure corepack is enabled
echo "📦 Ensuring corepack is enabled..."
corepack enable || echo "⚠️  corepack already enabled or failed to enable"

# Verify pnpm is available (should be installed via corepack in onCreate)
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm not found. Installing via corepack..."
  corepack prepare pnpm@latest --activate
fi

echo "📋 pnpm version: $(pnpm --version)"

# Install dependencies with a timeout and monitor output
echo "📦 Installing dependencies..."
if [[ -f "pnpm-lock.yaml" ]]; then
  echo "🗑️  Removing existing lockfile to avoid platform conflicts..."
  rm pnpm-lock.yaml
fi

# Install dependencies with a timeout and monitor output
###############################################################################
PIPE=$(mktemp -u)     # make a FIFO for stdout/stderr
mkfifo "$PIPE"

# 1️⃣ Start pnpm (wrapped in timeout) **first** and remember the timeout PID
timeout 60s pnpm install --no-frozen-lockfile >"$PIPE" 2>&1 &
TIMEOUT_PID=$!

# 2️⃣ Now start the reader that watches the output
(
  timeout_cancelled=false
  while read -r line; do
    echo "$line"                    # forward output to the console

    if [[ $timeout_cancelled == false && "$line" == *"Progress"* ]]; then
      echo "Progress detected, cancelling timeout."
      if kill -0 "$TIMEOUT_PID" 2>/dev/null; then
        kill  "$TIMEOUT_PID"        # stop the 60-second watchdog
      fi
      timeout_cancelled=true        # only cancel once
    fi
  done <"$PIPE"
) &

# 3️⃣ Wait for pnpm (or the timeout, if it wasn't cancelled in time)
wait "$TIMEOUT_PID" || echo "⚠️  pnpm install timed out or failed"

rm "$PIPE"                           
###############################################################################

# Show workspace info
echo "📂 Current directory: $(pwd)"
echo "📋 Workspace structure:"
ls -la package.json pnpm-workspace.yaml

echo ""
echo "🚀 DMNO DevContainer Setup Complete!"
echo ""
echo "✅ Dependencies installed automatically"
echo ""
echo "🎯 Available commands:"
echo "  • Test DMNO CLI: pnpm dmno --help"
echo "  • Run docs site: cd packages/docs-site && pnpm run dev"
echo "  • Run dev UI: cd packages/dev-ui && pnpm run dev"
echo "  • Build all packages: pnpm run build"
echo "  • Build specific package: cd packages/<package-name> && pnpm build"
echo "  • Run tests: pnpm test (if available)"
echo ""
echo "📚 Available development servers:"
echo "  • Docs site: http://localhost:4321"
echo "  • Dev UI: http://localhost:5173"
echo "  • Example apps: Various ports (check package.json scripts)"
echo ""
echo "🔧 See CONTRIBUTING.md for detailed development guidelines"
echo ""