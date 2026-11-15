/**
 * Run a command and require a specific exit code.
 * Usage: tsx scripts/expect-exit.ts <code> <cmd> [args...]
 */
import { spawnSync } from 'node:child_process';

const [expectedRaw, command, ...args] = process.argv.slice(2);
const expected = Number(expectedRaw);

if (!command || Number.isNaN(expected)) {
  console.error('Usage: expect-exit <code> <cmd> [args...]');
  process.exit(2);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const actual = result.status ?? 1;
if (actual !== expected) {
  console.error(`Expected exit code ${expected}, got ${actual} (${command} ${args.join(' ')})`);
  process.exit(1);
}
