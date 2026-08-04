/**
 * Quoting a message's literal text for the format its catalogue is written in.
 *
 * The contract this exists to keep is that a message is written in text, not
 * in a message format. Whatever a sentence contains means itself, and every
 * character the format reserves is quoted here, on the way into the catalogue.
 * Nothing upstream escapes anything: the parsers hand over the characters an
 * author typed, so no source file, and no message anyone writes, spells an
 * escape.
 *
 * That is also what makes the format replaceable. Escaping belongs to the
 * format rather than to the message — MF2 quotes with backslashes and treats
 * neither the apostrophe nor `#` as syntax — so a second format brings its own
 * escaper alongside its own converter, and the messages already written carry
 * over untouched.
 *
 * @param text The characters the message means, exactly as they were written.
 * @param following The character this text runs into once the message is
 *   assembled. Not always one of its own: text sits against whatever the
 *   message puts next, and quoting reaches across that seam.
 */
export type EscapeLiteral = (text: string, following: string) => string;

/**
 * Quote the characters ICU reads as syntax, so text a message means literally
 * arrives as text rather than as an argument the catalogue never declared.
 *
 * A brace is quoted as `'{'`, which is ICU's own escape. The apostrophe doing
 * that quoting therefore has to escape itself: one written in a message is
 * doubled wherever ICU would otherwise read it as opening a quote — in front
 * of a brace, a `#`, or another apostrophe. Everywhere else it is already
 * literal, and doubling it would rewrite the id of every message that contains
 * one.
 *
 * A bare `#` is left alone. Inside a plural that is the number being formatted,
 * which is the one piece of ICU a message does write on purpose.
 *
 * `following` matters because an apostrophe at the very end of a literal sits
 * against whatever comes next, and if that is the `{` of a placeholder or the
 * `}` closing a branch, it quotes syntax belonging to somebody else. `Click '`
 * beside `{name}` is `Click '{name}`, which ICU reads as the literal text
 * "Click {name}" — the placeholder swallowed whole.
 */
export const escapeIcuLiteral: EscapeLiteral = (text, following) => {
  let escaped = '';

  for (let i = 0; i < text.length; i++) {
    const character = text[i]!;

    if (character === '{' || character === '}') {
      // One quoted run for a whole stretch of braces, so `{{` is `'{{'`.
      const start = i;
      while (text[i + 1] === '{' || text[i + 1] === '}') i++;
      escaped += `'${text.slice(start, i + 1)}'`;
    } else if (character === "'" && /['{}#]/.test(text[i + 1] ?? following)) {
      escaped += "''";
    } else {
      escaped += character;
    }
  }

  return escaped;
};
