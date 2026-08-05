import type { Content, FunctionArg, Octothorpe, PlainArg, Select } from '@messageformat/parser';
import type { Model } from 'messageformat';
import { literal } from './options.js';
import { dateTimeStyle, numberStyle, StyleError } from './styles.js';

/**
 * The MF1 syntax tree, rewritten as an MF2 message.
 *
 * The two disagree about where a choice may appear. MF1 nests selects freely,
 * anywhere a character can go; MF2 has exactly one `.match` at the top of a
 * message, with one key per selector. Most of this module is that
 * reconciliation — every selector in the tree is lifted to the top, and the
 * message body is rewritten once per combination of their cases.
 *
 * Adapted from `@messageformat/icu-messageformat-1` (Apache-2.0), which solves
 * the same problem the same way.
 */

export type Token = Content | PlainArg | FunctionArg | Select | Octothorpe;

const isSelect = (token: Token): token is Select =>
  token.type === 'plural' || token.type === 'select' || token.type === 'selectordinal';

/** `=3` names the number three; anything else names a CLDR category. */
const asKey = (key: string) => (/^=\d+$/.test(key) ? Number(key.slice(1)) : key);

/**
 * Build the expression for a `{arg, type, style}` placeholder.
 *
 * A style the conversion cannot read does not fail the message: the argument
 * falls back to its bare formatter, so `{n, number, bogus}` still writes a
 * number and `{d, date, bogus}` still writes a date. A message is authored once
 * and read by everyone, and one that renders in a slightly wrong shape beats
 * one that renders `{$n}`.
 */
function functionRef(token: FunctionArg): Model.FunctionRef {
  let style = '';
  for (const part of token.param ?? []) {
    // Only literal text can be read at compile time; a placeholder nested inside
    // a style has no value yet, and MF2 has no way to defer one.
    if (part.type !== 'content') throw new Error(`Unsupported style part: ${part.type}`);
    style += part.value;
  }
  style = style.trim();

  const ref = (name: string, value?: unknown): Model.FunctionRef => ({
    type: 'function',
    name,
    ...(value === undefined ? {} : { options: { options: literal(value) } }),
  });

  try {
    switch (token.key) {
      case 'date':
      case 'time':
        return ref('say:datetime', dateTimeStyle(token.key, style));
      case 'number':
        return ref('say:number', numberStyle(style));
      case 'duration':
        return ref('say:duration');
      default:
        throw new StyleError(`Unsupported argument type ${token.key}`);
    }
  } catch (error) {
    // Only a style is recovered from. Nothing else in the `try` throws today,
    // so this is a guard against a parser one day doing so rather than a path
    // taken, and a bug in one must not be swallowed as a bad style.
    /* v8 ignore next */
    if (!(error instanceof StyleError)) throw error;
    switch (token.key) {
      case 'date':
      case 'time':
        return ref('say:datetime', dateTimeStyle(token.key, ''));
      case 'number':
        return ref('say:number', {});
      default:
        return ref('say:string');
    }
  }
}

/**
 * Convert one MF1 token into an MF2 pattern part.
 *
 * @param plural The argument a `#` in scope refers to, if any
 */
function toPart(token: Token, plural: string | null): Model.Expression | string {
  switch (token.type) {
    case 'content':
      return token.value;
    case 'argument':
      return { type: 'expression', arg: { type: 'variable', name: token.arg } };
    case 'function':
      return {
        type: 'expression',
        arg: { type: 'variable', name: token.arg },
        functionRef: functionRef(token),
      };
    case 'octothorpe':
      // The parser only makes a `#` a token when a plural encloses it — `#`
      // anywhere else is content by the time it reaches us — so the text case
      // is a guard rather than a path.
      /* v8 ignore next */
      return plural ? { type: 'expression', arg: { type: 'variable', name: plural } } : '#';
    /* v8 ignore next 2 -- the token union has no other members */
    default:
      throw new Error(`Unsupported token type: ${(token as Token).type}`);
  }
}

type Selector = {
  arg: string;
  /**
   * The variable this selector reads, which is `arg` for the first selector on
   * an argument and a generated name for any later one. MF2 allows a name to be
   * declared once, so two selects asking different questions of one argument —
   * the same `{n, plural}` at two offsets — need two names to live under. The
   * `#` a generated name cannot appear in an MF1 argument name, so one can
   * never collide with a name the message itself uses.
   */
  name: string;
  type: Select['type'];
  offset: number;
  keys: (string | number)[];
};

/**
 * Two selects are the same selector when they ask the same question of the same
 * argument. Their keys then merge into one dimension rather than multiplying
 * into two, which keeps `{n, plural, ...}` repeated in several branches from
 * squaring the number of variants.
 */
const sameSelector = (a: Pick<Selector, 'arg' | 'type' | 'offset'>) => (b: Selector) =>
  a.arg === b.arg && a.type === b.type && a.offset === b.offset;

/** Collect every selector in the message, at any depth, outermost first. */
function findSelectors(tokens: Token[]) {
  const selectors: Selector[] = [];

  const add = (selector: Omit<Selector, 'name'>) => {
    const existing = selectors.find(sameSelector(selector));
    if (existing) {
      existing.keys.push(...selector.keys);
      return;
    }
    // The first selector on an argument reads the argument itself; a second
    // question about the same one needs somewhere else to live.
    const taken = selectors.filter((s) => s.arg === selector.arg).length;
    const name = taken === 0 ? selector.arg : `${selector.arg}#${taken}`;
    selectors.push({ ...selector, name });
  };

  for (const token of tokens) {
    if (!isSelect(token)) continue;
    add({
      arg: token.arg,
      type: token.type,
      offset: token.pluralOffset ?? 0,
      keys: token.cases.map((c) => (token.type === 'select' ? c.key : asKey(c.key))),
    });
    for (const c of token.cases) for (const inner of findSelectors(c.tokens)) add(inner);
  }

  return selectors;
}

/**
 * The declaration binding a selector's name to the function that selects on it
 * — `say:string` for a `select`, `say:plural` otherwise.
 *
 * The first selector on an argument declares the argument itself, so that a
 * plain `{n}` elsewhere in the message and a `#` inside a branch both resolve
 * to the selected value. A later one declares a name of its own, reading the
 * argument a second time.
 */
function declaration({ arg, name, type, offset }: Selector): Model.Declaration {
  const functionRef: Model.FunctionRef =
    type === 'select'
      ? { type: 'function', name: 'say:string' }
      : {
          type: 'function',
          name: 'say:plural',
          options: { options: literal({ offset, ordinal: type === 'selectordinal' }) },
        };

  const value: Model.Expression = {
    type: 'expression',
    arg: { type: 'variable', name: arg },
    functionRef,
  };

  return name === arg ? { type: 'input', name, value } : { type: 'local', name, value };
}

/**
 * Order a selector's keys so exact numbers come before categories and `other`
 * comes last. MF2 takes the first variant whose keys all match, so this
 * ordering is what makes `=1` beat `one` and `one` beat `other`.
 */
function sortKeys(keys: (string | number)[]) {
  // Ranked rather than compared pairwise, so the order is total: comparing two
  // exact numbers by the rules alone answers `-1` whichever way round they are
  // asked, which is not an ordering and would leave anything that later depends
  // on it reading an arbitrary one.
  const rank = (key: string | number) => (typeof key === 'number' ? 0 : key === 'other' ? 2 : 1);
  return Array.from(new Set(keys)).sort((a, b) => rank(a) - rank(b));
}

/**
 * Convert a parsed MF1 message into an MF2 message.
 *
 * With no selectors this is a straight token-by-token walk. With any, the
 * message becomes a `select` whose variants are every combination of every
 * selector's keys, and each token is written into every variant the cases
 * enclosing it admit. That is the flattening: a token inside `one` lands in all
 * the variants keyed `one`, and a token outside every select lands in all of
 * them.
 */
export function toMessage(ast: Token[]): Model.Message {
  const selectors = findSelectors(ast);

  if (selectors.length === 0) {
    return { type: 'message', declarations: [], pattern: ast.map((t) => toPart(t, null)) };
  }

  // Build the key tuples first, then fill in their patterns below.
  let tuples: (string | number)[][] = [[]];
  for (const selector of selectors) {
    const keys = sortKeys(selector.keys);
    tuples = tuples.flatMap((tuple) => keys.map((key) => [...tuple, key]));
  }

  const variants: Model.Variant[] = tuples.map((tuple) => ({
    keys: tuple.map((key) =>
      key === 'other' ? { type: '*' } : { type: 'literal', quoted: false, value: String(key) },
    ),
    value: [],
  }));

  /**
   * Walk the tokens, appending each to the variants still in play.
   *
   * @param plural The argument a `#` in scope refers to, if any
   * @param filter The case chosen so far in each select already entered
   */
  function fill(
    tokens: Token[],
    plural: string | null,
    filter: { index: number; key: string | number }[],
  ) {
    for (const token of tokens) {
      if (isSelect(token)) {
        const index = selectors.findIndex(
          sameSelector({ arg: token.arg, type: token.type, offset: token.pluralOffset ?? 0 }),
        );
        // A `#` inside a `select` still refers to the plural enclosing it, and
        // inside a plural it refers to that plural's own name — which is not
        // the argument's when the same argument is selected twice.
        const inner = token.type === 'select' ? plural : selectors[index]!.name;
        for (const c of token.cases) {
          const key = token.type === 'select' ? c.key : asKey(c.key);
          fill(c.tokens, inner, [...filter, { index, key }]);
        }
        continue;
      }

      for (const variant of variants) {
        const matches = filter.every(({ index, key }) => {
          const vk = variant.keys[index]!;
          return vk.type === '*' ? key === 'other' : String(key) === vk.value;
        });
        if (!matches) continue;

        const part = toPart(token, plural);
        const last = variant.value.length - 1;
        // Adjacent text merges, so a variant reads as one string rather than a
        // run of fragments split where the cases it came from began and ended.
        if (typeof part === 'string' && typeof variant.value[last] === 'string') {
          variant.value[last] += part;
        } else {
          variant.value.push(part);
        }
      }
    }
  }

  fill(ast, null, []);

  return {
    type: 'select',
    declarations: selectors.map(declaration),
    selectors: selectors.map((s) => ({ type: 'variable', name: s.name })),
    variants,
  };
}
