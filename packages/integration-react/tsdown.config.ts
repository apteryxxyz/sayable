import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsdown';

const serverImport = 'import { getSay } from "./server.mjs";';
const clientImport =
  '"use client"; import { useSay as getSay } from "./client.mjs";';

export default defineConfig({
  entry: [
    'src/runtime/index.ts',
    'src/runtime/client.ts',
    'src/runtime/server.ts',
  ],
  async onSuccess() {
    const indexMjs = await readFile('dist/index.mjs', 'utf8');
    const indexServerMjs = serverImport + indexMjs;
    await writeFile('dist/index.server.mjs', indexServerMjs);
    const indexClientMjs = clientImport + indexMjs;
    await writeFile('dist/index.mjs', indexClientMjs);
  },
});
