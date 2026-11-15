/** Stable v1 identity: relative file path + function name. */
export function functionKey(filePath: string, functionName: string): string {
  return `${normalizePath(filePath)}::${functionName}`;
}

export function normalizePath(filePath: string): string {
  return filePath.replaceAll('\\', '/');
}

/**
 * Pull a bare name out of Oxlint/ESLint labels:
 * - function `foo` / method `bar`
 * - Function 'foo' / Method 'bar'
 */
export function parseFunctionName(label: string): string | undefined {
  const backtick = label.match(/`([^`]+)`/);
  if (backtick) return backtick[1];
  const quoted = label.match(/'([^']+)'/);
  if (quoted) return quoted[1];
  return undefined;
}

const DECLARATOR_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?$/;

/**
 * Name an anonymous function from the variable it is assigned to:
 * `const applyDiscount = (...) => {}` → "applyDiscount".
 * `offset` is Oxlint's UTF-8 byte offset of the function start.
 * shortcut: type annotations containing "=" (e.g. `const f: (a: A) => B = ...`) are not matched; use an AST if that matters.
 */
export function variableNameBefore(
  source: Uint8Array,
  offset: number,
): string | undefined {
  const before = Buffer.from(source).subarray(Math.max(0, offset - 300), offset).toString('utf8');
  return before.match(DECLARATOR_RE)?.[1];
}
