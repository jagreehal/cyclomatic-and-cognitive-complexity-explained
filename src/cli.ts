#!/usr/bin/env node
import { comparePaths } from './compare';
import { formatReport } from './report';

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command !== 'compare') {
    printUsage();
    return 2;
  }

  const flags = parseFlags(rest);
  if (!flags.base || !flags.head) {
    printUsage();
    return 2;
  }

  const result = await comparePaths(flags.base, flags.head, {
    cyclomaticThreshold: flags.cyclomaticThreshold,
    cognitiveThreshold: flags.cognitiveThreshold,
  });

  const report = formatReport(result.regressions, result.untracked, result.overrides);
  console.log(report);
  return result.regressions.length === 0 ? 0 : 1;
}

function parseFlags(args: string[]): {
  base?: string;
  head?: string;
  cyclomaticThreshold?: number;
  cognitiveThreshold?: number;
} {
  const out: {
    base?: string;
    head?: string;
    cyclomaticThreshold?: number;
    cognitiveThreshold?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--base' && next) {
      out.base = next;
      i++;
    } else if (arg === '--head' && next) {
      out.head = next;
      i++;
    } else if (
      (arg === '--cyclomatic-threshold' || arg === '--threshold') &&
      next
    ) {
      out.cyclomaticThreshold = Number(next);
      i++;
    } else if (arg === '--cognitive-threshold' && next) {
      out.cognitiveThreshold = Number(next);
      i++;
    }
  }
  return out;
}

function printUsage(): void {
  console.error(`Usage:
  complexity-ratchet compare --base <dir|json> --head <dir|json> [options]

Options:
  --threshold <n>              maximum modified cyclomatic for new functions (default 10)
  --cyclomatic-threshold <n>   alias for --threshold
  --cognitive-threshold <n>    maximum cognitive for new functions (default 15)

Run from any directory; --base and --head resolve from where you run it.`);
}

const code = await main(process.argv.slice(2));
process.exit(code);
