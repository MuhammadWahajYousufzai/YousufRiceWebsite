#!/bin/bash
set -e

echo "=== Building Next.js app ==="
pnpm build:web

echo "=== Preparing output for Appwrite SSR bundler ==="
# Remove old root-level .next if it exists
rm -rf .next

# Copy .next from apps/web to root so SSR bundler finds it.
# tar preserves pnpm's symlinks more reliably than cp -r across build hosts.
mkdir -p .next
tar -C apps/web/.next -cf - . | tar -C .next -xf -

# Create symlinks for packages the SSR bundler expects at root
ln -sf apps/web/node_modules/next node_modules/next
ln -sf apps/web/node_modules/react node_modules/react
ln -sf apps/web/node_modules/react-dom node_modules/react-dom
ln -sf apps/web/node_modules/@next node_modules/@next

echo "=== Build preparation complete ==="
