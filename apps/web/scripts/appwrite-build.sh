#!/bin/bash
set -euo pipefail

echo "=== Building Next.js app ==="
pnpm build:web

echo "=== Preparing output for Appwrite SSR bundler ==="
# Remove old root-level .next if it exists
rm -rf .next

# Copy .next from apps/web to root so SSR bundler finds it.
# tar preserves pnpm's symlinks more reliably than cp -r across build hosts.
mkdir -p .next
tar -C apps/web/.next -cf - . | tar -C .next -xf -

echo "=== Copying public assets to root ==="
rm -rf public
mkdir -p public
tar -C apps/web/public -cf - . | tar -C public -xf -

echo "=== Hoisting web runtime dependencies for Appwrite SSR ==="
node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const webPackagePath = path.join(root, "apps/web/package.json");
const webNodeModules = path.join(root, "apps/web/node_modules");
const rootNodeModules = path.join(root, "node_modules");
const webPackage = JSON.parse(fs.readFileSync(webPackagePath, "utf8"));
const dependencies = webPackage.dependencies || {};

function removeIfReplaceable(destination) {
  const current = fs.lstatSync(destination, { throwIfNoEntry: false });

  if (!current) {
    return;
  }

  if (current.isSymbolicLink() || current.isFile()) {
    fs.rmSync(destination);
    return;
  }

  throw new Error(
    `Refusing to replace non-symlink dependency at ${path.relative(root, destination)}`,
  );
}

function linkDependency(name) {
  const version = dependencies[name];

  if (typeof version === "string" && version.startsWith("workspace:")) {
    console.log(`Skipping workspace dependency ${name}; Next transpiles it into the build.`);
    return;
  }

  const source = path.join(webNodeModules, ...name.split("/"));
  const destination = path.join(rootNodeModules, ...name.split("/"));
  const sourceStat = fs.lstatSync(source, { throwIfNoEntry: false });

  if (!sourceStat) {
    console.warn(`Skipping ${name}; ${path.relative(root, source)} does not exist.`);
    return;
  }

  const resolved = fs.realpathSync(source);

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Resolved dependency ${name} outside project root: ${resolved}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  removeIfReplaceable(destination);

  const relativeTarget = path.relative(path.dirname(destination), resolved) || ".";
  fs.symlinkSync(relativeTarget, destination);
  console.log(`Linked ${name} -> ${relativeTarget}`);
}

for (const name of Object.keys(dependencies).sort()) {
  linkDependency(name);
}

// Clean up stale symlinks from older build-script versions.
for (const stale of ["node_modules/@next"]) {
  const stalePath = path.join(root, stale);
  const current = fs.lstatSync(stalePath, { throwIfNoEntry: false });

  if (current?.isSymbolicLink()) {
    fs.rmSync(stalePath);
  }
}
NODE

echo "=== Build preparation complete ==="
