import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsdown';

const CLIENT_IMPORT = '"use client"; import { useSay as GET_SAY } from "./client.mjs";';
const SERVER_IMPORT = 'import { getSay as GET_SAY } from "./server.mjs";';

export default defineConfig({
  entry: [
    'src/runtime/index.ts',
    'src/runtime/client.ts',
    'src/runtime/client.server.ts',
    'src/runtime/server.ts',
  ],
  target: 'es2022',
  // Kept out of the bundle so the server build of the client entry *imports*
  // the `"use client"` module rather than inlining it, which is what keeps the
  // boundary a boundary. The specifiers are rewritten to the built names below.
  deps: { neverBundle: ['./client.js', './server.js'] },
  outputOptions: { comments: { jsdoc: false } },
  async onSuccess() {
    const clientServer = await readFile('dist/client.server.mjs', 'utf8');
    await writeFile(
      'dist/client.server.mjs',
      clientServer.replace(/(["'])\.\/(client|server)\.js\1/g, '$1./$2.mjs$1'),
    );

    const index = await readFile('dist/index.mjs', 'utf8');
    await writeFile('dist/index.server.mjs', SERVER_IMPORT + index);
    // The `"use client"` build stays at `dist/index.mjs`. Naming it
    // `index.client.mjs` made framework import guards that deny `**/*.client.*`
    // in a server environment (TanStack Start) reject it, even though a
    // `"use client"` module is meant to be server-rendered.
    await writeFile('dist/index.mjs', CLIENT_IMPORT + index);
  },
});
