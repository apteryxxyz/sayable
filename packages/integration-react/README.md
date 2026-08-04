# @saykit/react

> React integration for [SayKit](https://saykit.js.org).

[![Coverage](https://codecov.io/gh/k0d13/saykit/graph/badge.svg?flag=integration-react)](https://codecov.io/gh/k0d13/saykit?flags%5B0%5D=integration-react)

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
      <Say.Plural _={count} one={<>{count} item</>} other={<>{count} items</>} />
    </SayProvider>
  );
}
```

## Documentation

[React integration guide](https://saykit.js.org/integrations/react) at [saykit.js.org](https://saykit.js.org).
