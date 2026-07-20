---
"@saykit/react": patch
---

Ship the default entry as `dist/index.mjs` rather than `dist/index.client.mjs`.

Frameworks that guard their server environment against client-only modules commonly deny the `**/*.client.*` file pattern. TanStack Start does, and since its SSR environment does not set the `react-server` condition, `@saykit/react` resolved to `index.client.mjs` and was rejected on its filename alone — even though a `"use client"` module is meant to be server-rendered. The build output is otherwise unchanged: the `react-server` condition still resolves to `dist/index.server.mjs`.
