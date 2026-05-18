# @saykit/react

> React integration for [SayKit](https://saykit.js.org).

A `<Say>` component for rendering translated content in server and client components, a `<SayProvider>` and `useSay()` for client trees, and a small server runtime (`setSay`, `getSay`, `unstable_createWithSay`).

## Install

```sh
pnpm add @saykit/react saykit
```

You will also need a SayKit build-tool plugin and a `saykit.config.ts`.

## Usage

```tsx
import { Say, SayProvider } from '@saykit/react/client';

function App() {
  return (
    <SayProvider locale="fr" messages={fr}>
      <Say>Hello, {name}!</Say>
      <Say.Plural _={count} one="# item" other="# items" />
    </SayProvider>
  );
}
```

## Documentation

[React integration guide](https://saykit.js.org/integrations/react) at [saykit.js.org](https://saykit.js.org).
