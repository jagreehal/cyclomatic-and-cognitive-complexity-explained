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

