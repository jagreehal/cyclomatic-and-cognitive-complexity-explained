#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src/cli.ts');

// Resolve tsx from this package and keep the caller's cwd, so --base/--head are relative to it.
const result = spawnSync(
  process.execPath,
  ['--import', import.meta.resolve('tsx'), cli, ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env },
);

process.exit(result.status ?? 1);
