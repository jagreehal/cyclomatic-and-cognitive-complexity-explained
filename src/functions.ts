import { parseSync } from 'oxc-parser';

/** A function in a source file, with a name that stays stable while the code around it changes. */
export type NamedFunction = {
  /** UTF-16 offset of the function node, as the parser reports it. */
  start: number;
  /**
   * Qualified name:
   *   processPayment                 top-level function or `const fn = () => {}`
   *   PaymentService.validate        class method or class field
   *   handlers.onSubmit              method in an object literal assigned to a variable
   *   createChart>normalise          function declared inside another function
   *   render>items.map()             callback passed to a call
   *   PAYMENT_RULES[3]               function in an array literal
   *   default                        anonymous default export
   * A repeated name in one file gets #2, #3, … in source order.
   */
  name: string;
};

type Node = { type: string; start: number; end: number; [key: string]: unknown };

type Context = {
  /** Qualified name of the enclosing function, if any. */
  scope?: string;
  /** Name of the enclosing class, when walking its body. */
  className?: string;
  /** Name of the variable an object or array literal is assigned to. */
  ownerName?: string;
  /** Inside a `['key', fn]` tuple: its one function takes the tuple's name, with no index. */
  keyedTuple?: boolean;
};

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function keyName(key: unknown, source: string): string {
  if (!isNode(key)) return '?';
  if (key.type === 'Identifier' || key.type === 'PrivateIdentifier') {
    const prefix = key.type === 'PrivateIdentifier' ? '#' : '';
    return prefix + String(key.name);
  }
  if (key.type === 'Literal') return String(key.value);
  return `[${source.slice(key.start, key.end)}]`;
}

function snippet(node: Node, source: string): string {
  const text = source.slice(node.start, node.end).replace(/\s+/g, ' ');
  return text.length > 40 ? `${text.slice(0, 37)}...` : text;
}

/** `items.map((i) => i).filter` → `items.map().filter`: call chains without their arguments. */
function calleeName(node: Node, source: string): string {
  switch (node.type) {
    case 'Identifier':
      return String(node.name);
    case 'ThisExpression':
      return 'this';
    case 'MemberExpression': {
      if (!isNode(node.object)) return snippet(node, source);
      const property = node.computed
        ? `[${snippet(node.property as Node, source)}]`
        : `.${keyName(node.property, source)}`;
      return calleeName(node.object, source) + property;
    }
    case 'CallExpression':
      return isNode(node.callee) ? `${calleeName(node.callee, source)}()` : snippet(node, source);
    default:
      return snippet(node, source);
  }
}

function identifierName(node: unknown): string | undefined {
  return isNode(node) && node.type === 'Identifier' ? String(node.name) : undefined;
}

function stringLiteral(node: unknown): string | undefined {
  return isNode(node) && node.type === 'Literal' && typeof node.value === 'string' ? node.value : undefined;
}

type Namer = (fn: Node, parent: Node, ctx: Context, source: string) => string;

const memberName: Namer = (_fn, parent, ctx, source) =>
  `${ctx.className ?? 'class'}.${keyName(parent.key, source)}`;

const callbackName: Namer = (_fn, parent, _ctx, source) =>
  isNode(parent.callee) ? `${calleeName(parent.callee, source)}()` : 'callback';

const arrayEntryName: Namer = (fn, parent, ctx) => {
  const elements = parent.elements as unknown[];
  const functions = elements.filter((e) => isNode(e) && FUNCTION_TYPES.has(e.type));
  if (ctx.keyedTuple && ctx.ownerName && functions.length === 1) return ctx.ownerName;
  return `${ctx.ownerName ?? 'array'}[${elements.indexOf(fn)}]`;
};

/** How to name an anonymous function, by the syntax it sits in. */
const NAMERS: Record<string, Namer> = {
  VariableDeclarator: (_fn, parent) => identifierName(parent.id) ?? 'anonymous',
  MethodDefinition: memberName,
  PropertyDefinition: memberName,
  AccessorProperty: memberName,
  Property: (_fn, parent, ctx, source) =>
    ctx.ownerName ? `${ctx.ownerName}.${keyName(parent.key, source)}` : keyName(parent.key, source),
  AssignmentExpression: (_fn, parent, _ctx, source) =>
    isNode(parent.left) ? snippet(parent.left, source) : 'anonymous',
  CallExpression: callbackName,
  NewExpression: callbackName,
  ArrayExpression: arrayEntryName,
  ExportDefaultDeclaration: () => 'default',
};

/** The function's own name, from the syntax around it. */
function ownName(fn: Node, parent: Node | undefined, ctx: Context, source: string): string {
  const id = identifierName(fn.id);
  if (id) return id;
  const namer = parent ? NAMERS[parent.type] : undefined;
  return namer ? namer(fn, parent!, ctx, source) : 'anonymous';
}

/** Every function in a file, with its qualified name. Returns [] if the file does not parse. */
export function namedFunctions(filename: string, source: string): NamedFunction[] {
  return analyseFile(filename, source).functions;
}

const KEY_PROPERTIES = new Set(['id', 'key', 'name', 'outcome']);

function isKeyProperty(prop: unknown): boolean {
  return (
    isNode(prop) &&
    prop.type === 'Property' &&
    KEY_PROPERTIES.has(identifierName(prop.key) ?? '') &&
    stringLiteral(prop.value) !== undefined
  );
}

/** A key that names an entry in a table regardless of its position, if the entry has one. */
function entryKey(item: Node): string | undefined {
  if (item.type === 'ArrayExpression') return stringLiteral((item.elements as unknown[])[0]);
  if (item.type !== 'ObjectExpression') return undefined;
  const prop = (item.properties as unknown[]).find(isKeyProperty);
  return prop ? stringLiteral((prop as Node).value) : undefined;
}

function classContext(node: Node, parent: Node | undefined, ctx: Context): Context {
  const declaredAs = parent?.type === 'VariableDeclarator' ? identifierName(parent.id) : undefined;
  const name = identifierName(node.id) ?? declaredAs ?? 'class';
  return ctx.scope ? { className: `${ctx.scope}>${name}` } : { ...ctx, className: name };
}

/** Node types an owner name passes through on its way to a literal's entries. */
const KEEPS_OWNER = new Set(['ObjectExpression', 'ArrayExpression', 'Property', 'TSAsExpression', 'TSSatisfiesExpression']);

/** The context a non-function node hands to its children. */
function childContext(node: Node, parent: Node | undefined, ctx: Context, source: string): Context {
  switch (node.type) {
    case 'ClassDeclaration':
    case 'ClassExpression':
      return classContext(node, parent, ctx);
    case 'VariableDeclarator': {
      const id = identifierName(node.id);
      return id ? { ...ctx, ownerName: id } : ctx;
    }
    case 'Property': {
      const nestedObject = isNode(node.value) && node.value.type === 'ObjectExpression';
      return ctx.ownerName && nestedObject
        ? { ...ctx, ownerName: `${ctx.ownerName}.${keyName(node.key, source)}` }
        : ctx;
    }
    default:
      // An owner name only reaches literals directly under the declaration.
      return ctx.ownerName && !KEEPS_OWNER.has(node.type) ? { ...ctx, ownerName: undefined } : ctx;
  }
}

function* children(node: Node): Generator<Node> {
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) if (isNode(item)) yield item;
  }
}

/**
 * The context for one entry of a table assigned to `owner`. Entries are named by
 * their key when they have one, so reordering the table cannot pair a rule with
 * another rule's history: PAYMENT_RULES["flagged-vip-review"]. Entries without a
 * key fall back to position: RULES[3].
 */
function entryContext(item: Node, index: number, owner: string, ctx: Context): Context {
  if (item.type !== 'ArrayExpression' && item.type !== 'ObjectExpression') return ctx;
  const key = entryKey(item);
  if (key === undefined) return { ...ctx, ownerName: `${owner}[${index}]` };
  return { ...ctx, ownerName: `${owner}[${JSON.stringify(key)}]`, keyedTuple: item.type === 'ArrayExpression' };
}

/** Parse a file once: its named functions, and any parse errors (which leave `functions` empty). */
export function analyseFile(filename: string, source: string): { functions: NamedFunction[]; errors: string[] } {
  const result = parseSync(filename, source);
  if (result.errors.length > 0) {
    return { functions: [], errors: result.errors.map((e) => e.message) };
  }

  const found: NamedFunction[] = [];
  const seen = new Map<string, number>();

  // Class members get no scope prefix: the class name already carries it.
  const record = (fn: Node, parent: Node | undefined, ctx: Context): string => {
    const own = ownName(fn, parent, ctx, source);
    const base = ctx.scope ? `${ctx.scope}>${own}` : own;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const name = count === 1 ? base : `${base}#${count}`;
    found.push({ start: fn.start, name });
    return name;
  };

  const visit = (node: Node, parent: Node | undefined, ctx: Context): void => {
    const childCtx = FUNCTION_TYPES.has(node.type)
      ? { scope: record(node, parent, ctx) }
      : childContext(node, parent, ctx, source);
    const owner = node.type === 'ArrayExpression' ? ctx.ownerName : undefined;
    if (!owner) {
      for (const child of children(node)) visit(child, node, childCtx);
      return;
    }
    // Real indexes, holes included, so `[a, , b]` names b as [2].
    (node.elements as unknown[]).forEach((item, i) => {
      if (isNode(item)) visit(item, node, entryContext(item, i, owner, childCtx));
    });
  };

  visit(result.program as unknown as Node, undefined, {});
  return { functions: found, errors: [] };
}
