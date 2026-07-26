# Carbon example

A book-club Discord bot built on [`@buape/carbon`](https://github.com/buape/carbon), deployed to
Cloudflare Workers, and localised with [`@saykit/carbon`](../../packages/integration-carbon).

Discord is an unusual i18n target: a command's _definition_ is registered once and must carry every
translation with it, while a command's _reply_ is rendered per interaction in one user's language.
This example shows both halves.

## What it demonstrates

| Concern                                                       | Where                         |
| ------------------------------------------------------------- | ----------------------------- |
| `SayPlugin` — installs `interaction.say` / `guild.say`        | `src/index.ts`                |
| `withSay(Command)` — `(say, properties)`, run once per locale | `src/commands/pick.ts`        |
| `withSay(CommandWithSubcommands)` + localised options         | `src/commands/leaderboard.ts` |
| `withSay(Button)` / `withSay(Modal)` — `(properties)` only    | `pick.ts`, `join.ts`          |
| `interaction.say` — the invoking user's locale                | everywhere                    |
| `guild.say` — the **server's** `preferred_locale`             | `src/commands/announce.ts`    |
| `say.plural` / `say.ordinal` / `say.select` outside React     | `leaderboard.ts`              |

## Two overloads, because there are two kinds of object

```ts
class PickCommand extends withSay(Command) {
  constructor(say: Say) {
    super(say, (say) => ({ name: say`pick`, description: say`…` }));
  }
}

class RemindMeButton extends withSay(Button) {
  constructor(say: Say) {
    super({ label: say`Remind me the day before` });
  }
}
```

For a **command**, `properties` is a function and it is called once for every configured locale.
The results are folded into Discord's `name_localizations` and `description_localizations`, so a
French user sees `/choix` and a German user sees `/auswahl` — one registration, every language.

For a **component or modal**, there is nothing pre-registered with Discord: the object is built at
the moment someone is looking at it. So the overload takes plain properties, already resolved
against whichever `Say` you passed in — usually `interaction.say`.

## `interaction.say` vs `guild.say`

`interaction.say` is a clone activated from `interaction.rawData.locale` — the language of the one
person who ran the command. That is right for ephemeral replies and modals.

`guild.say` is activated from the guild's `preferred_locale`. Use it when the message is for the
whole channel: `/announce` posts in the server's language, because it would be strange for a public
notice to appear in Japanese only because the person who triggered it reads Japanese.

Both are clones, so neither can disturb the shared instance or each other.

## Locale codes

`saykit.config.ts` uses Discord's own codes (`en-US`, `fr`, `de`, `ja`) rather than bare language
tags. Discord sends those exact strings, so `say.match` lands an exact hit instead of falling back
to prefix matching.

`src/i18n.ts` calls `say.activate('en-US')` at module scope. That is not for rendering — it sets
which locale becomes the _default_ name and description when the command definitions are built,
with the others attached as localisations.

## Running it

```sh
cp examples/carbon/.dev.vars.example examples/carbon/.dev.vars   # fill in your bot's credentials
pnpm install
pnpm --filter carbon-example dev       # wrangler dev
pnpm --filter carbon-example extract   # after editing any message
```

The build goes through `tsdown` with `unplugin-saykit/rolldown` (see `tsdown.config.ts`) — the same
plugin as the Vite examples, just a different adapter entry.

> Only typechecking and the build are verified in this repo; actually talking to Discord needs a
> registered application and a public URL.

Further reading: the [Carbon integration docs](../../website/content/integrations/carbon.mdx).
