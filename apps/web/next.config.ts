import path from 'node:path';
import type { NextConfig } from 'next';

/** Monorepo root (two levels up from apps/web). */
const repoRoot = path.join(__dirname, '..', '..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not let `next dev` write AGENTS.md/CLAUDE.md into apps/web (the repo keeps its own instructions).
  agentRules: false,
  // @apohenia/domain ships TypeScript source; Next compiles it in place.
  transpilePackages: ['@apohenia/domain'],
  // Seeds import JSON from <repo>/data, outside apps/web. Resolve and trace from the monorepo root.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
