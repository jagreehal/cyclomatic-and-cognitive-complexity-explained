#!/usr/bin/env node
import { comparePaths, verdict } from './compare.js';
import { formatReport } from './report.js';

/** 0 pass, 1 regression, 2 bad arguments, 3 measurement incomplete, 4 the tool itself failed. */
const EXIT = { pass: 0, fail: 1, incomplete: 3 } as const;

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
    requireOverrideApproval: flags.requireOverrideApproval,
  });

  console.log(formatReport(result));
  return EXIT[verdict(result)];
}

function parseFlags(args: string[]): {
  base?: string;
  head?: string;
  cyclomaticThreshold?: number;
  cognitiveThreshold?: number;
  requireOverrideApproval?: boolean;
} {
  const out: {
    base?: string;
    head?: string;
    cyclomaticThreshold?: number;
    cognitiveThreshold?: number;
    requireOverrideApproval?: boolean;
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
    } else if (arg === '--require-override-approval') {
      out.requireOverrideApproval = true;
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
  --require-override-approval  fail on any new override instead of treating it as an approval

Exit codes: 0 pass, 1 regression, 2 bad arguments, 3 measurement incomplete, 4 tool error.

Run from any directory; --base and --head resolve from where you run it.`);
}

let code: number;
try {
  code = await main(process.argv.slice(2));
} catch (error) {
  console.error(`complexity-ratchet failed: ${error instanceof Error ? error.message : String(error)}`);
  code = 4;
}
process.exit(code);
